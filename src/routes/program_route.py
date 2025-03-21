import asyncio
import re
from concurrent import futures
from os.path import join
from typing import Annotated, Any, Dict, List, Optional, Pattern, Tuple, Union

import boto3 as boto3
from fastapi import APIRouter, Body, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import and_, exists, or_, select
from sqlalchemy.exc import MultipleResultsFound, NoResultFound
from sqlalchemy.orm import Session, subqueryload

from models import get_db
from models.organisation_model import Organisation
from models.program_model import OrganisationProgram, Program
from models.user_model import ProgramUser, User, UserRole, current_user
from schema import ApiResponse
from utilities.rolemanager import manager
from utilities.rolemanager.rolesdb import RolesDb

router = APIRouter()


STATUS_OK = "ok"
STATUS_FAILURE = "failure"
STATUS_EXTRA_PARAMETER = "Extraneous parameter"
STATUS_ACCESS_DENIED = "Access denied"
STATUS_MISSING_PARAMETER = "Missing parameter"

DEFAULT_REPOSITORY = "dbx"


# TODO: Rewrite this with new roles
def get_program_info_for_user(email: str) -> Tuple[Dict[str, Dict[str, str]], str]:
    # Start with the user's roles in programs, because that gets the list of relevant programs
    # {program: roles}
    manager.open_tables()

    programs_and_roles: Dict[str, str] = manager.get_programs_for_user(email)
    # {program: {'roles': roles}}
    result: Dict[str, Dict[str, str]] = {
        p: {"roles": r} for p, r in programs_and_roles.items()
    }
    programids: List[str] = [x for x in result.keys()]

    # Add the friendly name, and collect repository info.
    # {repo: [prog1, prog2, ...]}
    repository_programs: Dict[str, List[str]] = (
        {}
    )  # list of programs in each repository.
    programs_table_items = (
        RolesDb().get_program_items()
    )  # programs_table.scan()['Items']
    for programid in programids:
        item = programs_table_items.get(programid)
        program_repository = item.get("repository", DEFAULT_REPOSITORY).lower()  # type: ignore
        list = repository_programs.setdefault(program_repository, [])
        list.append(programid)
        # add {'name': program_name} as {program: {'roles':roles, 'name':program_name}}
        result[programid]["name"] = item.get("program_name") or programid  # type: ignore

    # Find the repository with the most programs, and make that the implicit repository.
    implicit_repo: Union[str, None] = None
    max_prog = -1
    for repo, program_list in repository_programs.items():
        if len(program_list) > max_prog:
            implicit_repo = repo
            max_prog = len(program_list)
    if implicit_repo:
        del repository_programs[implicit_repo]
    # Invert the repositories list into the result
    for repo, program_list in repository_programs.items():
        for programid in program_list:
            # add {'repository':repository} to {program: {'roles':roles, ...}}
            result[programid]["repository"] = repo
    return (result, implicit_repo)  # type: ignore


def _add_deployment_revs(
    program_info: Dict[str, Dict], implict_repo: str, use_async: bool = False
) -> None:
    """
    Given program_info ({program: {'name':name, 'roles':roles}}) and the default repository, add
    the most recent deployment rev to the program_info.
    :param program_info: The program_info to which deployment revs are to be added.
    :type program_info: Dict[str,Dict[str,str]]
    :param implict_repo: The repo for any program without an explicitly defined repo. ('dbx' or 's3')
    :type implict_repo: str
    :return: None
    """

    def get_revs(pattern: Pattern, bucket: str, prefix: str) -> Dict[str, str]:
        """
        Given a bucket and a prefix, and a pattern for matching files, find the contained .rev files.
        :param pattern: Pattern for matching deployment.rev files from a full object name. The pattern
                should define group(1) as the program name and group(2) as the revision.
        :param bucket: The S3 bucket to be examined.
        :param prefix: Prefix within the bucket, to restrict the search to more relevant objects.
        :return: A dict{str:str} of {program:deployment.rev}
        """

        def _list_objects(Bucket: str, Prefix=""):
            paginator = s3_client.get_paginator("list_objects_v2")
            kwargs = {"Bucket": Bucket, "Prefix": Prefix}
            for objects in paginator.paginate(**kwargs):
                for obj in objects.get("Contents", []):
                    yield obj

        # print(f'Getting objects in {bucket} / {prefix}')
        s3_client = s3 or boto3.client("s3")
        result: Dict[str, str] = {}
        for object in _list_objects(Bucket=bucket, Prefix=prefix):
            if matcher := pattern.match(object.get("Key")):
                program = matcher.group(1)
                result[program] = matcher.group(2)
        # print(f'Got {len(result)} objects from {bucket} / {prefix}')
        return result

    global s3
    import boto3

    if s3 is None:  # type: ignore
        s3 = boto3.client("s3")

    dbx_rev_pattern = re.compile(
        r"(?i)^projects/([a-z0-9_-]+)/([a-z0-9_-]+)\.(?:current|rev)$"
    )
    s3_rev_pattern = re.compile(
        r"(?i)^([a-z0-9_-]+)/TB-Loaders/published/([a-z0-9_-]+)\.rev$"
    )
    dbx_programs = [
        prog
        for prog, info in program_info.items()
        if info.get("repository", implict_repo) == "dbx"
    ]
    s3_programs = [
        prog
        for prog, info in program_info.items()
        if info.get("repository", implict_repo) != "dbx"
    ]

    if dbx_programs:
        # enumerate all of the deployments for dropbox hosted programs
        for program, rev in get_revs(
            dbx_rev_pattern, bucket="acm-content-updates", prefix="projects"
        ).items():
            if program in dbx_programs:
                program_info[program]["deployment_rev"] = rev

    def make_s3_getter(the_program):
        def fn():
            return get_revs(
                s3_rev_pattern,
                bucket="amplio-program-content",
                prefix=f"{the_program}/TB-Loaders/published",
            )

        return fn

    if use_async:
        """
        If the caller requested async operation, run S3 queries in parallel.
        """

        async def non_blocking(executor):
            loop = asyncio.get_event_loop()
            blocking_tasks = []
            for s3_program in s3_programs:
                blocking_tasks.append(
                    loop.run_in_executor(executor, make_s3_getter(s3_program))
                )
            completed, pending = await asyncio.wait(blocking_tasks)
            results = [t.result() for t in completed]
            return results

        executor = futures.ThreadPoolExecutor(max_workers=20)
        event_loop = asyncio.get_event_loop()
        non_blocking_results = event_loop.run_until_complete(non_blocking(executor))
        print(non_blocking_results)
        for rm in non_blocking_results:
            for p, r in rm.items():
                if p in s3_programs:
                    program_info[p]["deployment_rev"] = r
    else:
        for s3_program in s3_programs:
            # enumerate published deployments for s3 hosted programs
            for program, rev in make_s3_getter(s3_program)().items():
                program_info[program]["deployment_rev"] = rev


# TODO: make this get_program_details {program_id}
@router.get("")
def get_programs(
    depls: bool = False,
    use_async: bool = False,
    email: str = Depends(current_user),
):
    # TODO: rewrite to use programs of the current user

    # TODO:return data: {program-data}
    print("Executed")

    # add_deployments = _bool_arg(depls)
    # use_async = _bool_arg(use_async)
    program_info, implicit_repo = get_program_info_for_user(email)
    if depls:
        _add_deployment_revs(program_info, implicit_repo, use_async)

    return {
        "result": {  # 'output': program_roles,
            "status": STATUS_OK,
            "programs": program_info,
            "implicit_repository": implicit_repo,
        }
    }


@router.get("/all")
def get_all_programs(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    where_exists = exists(OrganisationProgram).where(
        OrganisationProgram.program_id == Program.id,
        exists(Organisation).where(
            or_(
                Organisation.id.in_(
                    [OrganisationProgram.organisation_id, user.organisation_id]
                ),
                Organisation.parent_id.in_(
                    [OrganisationProgram.organisation_id, user.organisation_id]
                ),
            )
        ),
    )

    results = (
        db.query(Program)
        .filter(where_exists)
        .options(
            subqueryload(Program.project),
            subqueryload(Program.organisations).options(
                subqueryload(OrganisationProgram.organisation)
            ),
            subqueryload(Program.users).options(subqueryload(ProgramUser.user)),
        )
        .all()
    )

    return ApiResponse(data=results)


# # TODO: Add permission check
@router.get("/{program_id}/organisation-users")
def get_program_users(
    program_id: int,
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(
            exists(OrganisationProgram).where(
                and_(
                    OrganisationProgram.organisation_id == User.organisation_id,
                    OrganisationProgram.program_id == program_id,
                )
            )
        )
        .all()
    )

    return ApiResponse(data=users)


class ManageOrgDto(BaseModel):
    organisation_id: int
    program_id: int


@router.post("/organisations")
def add_organisation_to_program(
    dto: ManageOrgDto,
    request: Request,
    db: Session = Depends(get_db),
):
    """Add an organisation to a program"""

    try:
        organisation_program = OrganisationProgram()
        organisation_program.program_id = dto.program_id
        organisation_program.organisation_id = dto.organisation_id

        db.merge(organisation_program)
        db.commit()
    except MultipleResultsFound as e:
        raise HTTPException(
            status_code=400, detail="Organisation already added to program"
        )

    return get_all_programs(db=db, user=request.state.current_user)


@router.delete("/{program_id}/organisations/{organisation_id}")
def remove_organisation_from_program(
    program_id: int,
    organisation_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Remove an organisation from a program"""

    try:
        organisation_program = (
            db.query(OrganisationProgram)
            .filter_by(program_id=program_id, organisation_id=organisation_id)
            .one()
        )

        db.delete(organisation_program)

        # Remove all organisation users from the program
        db.query(ProgramUser).filter(
            ProgramUser.program_id == program_id,
            ProgramUser.user_id.in_(
                select(User.id).where(User.organisation_id == organisation_id)
            ),
        ).delete(synchronize_session=False)

        db.commit()
    except NoResultFound as e:
        pass

    return get_all_programs(db=db, user=request.state.current_user)


@router.post("/users")
def add_user_to_program(
    user_id: Annotated[int, Body()],
    program_id: Annotated[int, Body()],
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Add a user to a program"""

    try:
        program_user = ProgramUser()
        program_user.program_id = program_id
        program_user.user_id = user_id

        db.merge(program_user)
        db.commit()
    except MultipleResultsFound as e:
        raise HTTPException(status_code=400, detail="User already added to program")

    return get_all_programs(db=db, user=user)


@router.delete("/{program_id}/users")
def remove_user(
    program_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Remove a user from a program"""

    program_user = (
        db.query(ProgramUser)
        .filter(ProgramUser.program_id == program_id, ProgramUser.user_id == user_id)
        .first()
    )

    if program_user is None:
        raise HTTPException(status_code=404, detail="Program User not found")

    # Delete all roles for the user in the program
    db.query(UserRole).filter(
        UserRole.program_id == program_id, UserRole.user_id == user_id
    ).delete()

    db.delete(program_user)
    db.commit()

    return get_all_programs(db=db, user=user)
