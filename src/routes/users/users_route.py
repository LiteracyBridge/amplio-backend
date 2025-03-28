from typing import Annotated, Optional, cast

import boto3
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel
from sentry_sdk import capture_exception
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, subqueryload

from config import AWS_REGION, config
from jwt_verifier import VERIFIED_JWT_CLAIMS_CACHE
from models import Invitation, get_db
from models.organisation_model import Organisation
from models.program_model import Program, Project
from models.user_model import ProgramUser, User, UserRole, current_user
from schema import ApiResponse
from utilities import generate_uuid

router = APIRouter()


class InvitationDto(BaseModel):
    first_name: str
    last_name: str
    email: str
    organisation_id: Optional[int] = None


@router.get("/organisations")
def get_organisations(
    user: User = Depends(current_user), db: Session = Depends(get_db)
):
    """Get all organisations for the user"""

    return ApiResponse(
        data=db.query(Organisation)
        .filter(
            or_(
                Organisation.id == user.organisation_id,
                Organisation.parent_id == user.organisation_id,
            )
        )
        .all()
    )


@router.get("/me")
def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Returns the account info of the authenticated user.

    If the user does not exist, it tries to create a new user
    from the invitations table (if exists)
    """

    token: str = str(request.headers.get("Authorization").replace("Bearer ", ""))  # type: ignore

    # NB: The email is intentionally lowercased to avoid query case sensitivity issues.
    # Since AWS congito allows case insensitive email, there have been cases where the login email is
    # different from what is stored in db because different case was used to signup.
    email = str(VERIFIED_JWT_CLAIMS_CACHE[token].get("email")).lower()

    user = (
        db.query(User)
        .filter(func.lower(User.email) == email)
        .options(
            subqueryload(User.roles).options(subqueryload(UserRole.role)),
            subqueryload(User.programs).options(
                subqueryload(ProgramUser.program).options(
                    subqueryload(Program.project).options(
                        subqueryload(Project.deployments)
                    )
                )
            ),
        )
        .first()
    )

    if user is None:
        user = Invitation.create_user(db=db, email=email)

        if user is None:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized",
            )

        user = (
            db.query(User)
            .filter(User.email == email)
            .options(
                subqueryload(User.roles).options(subqueryload(UserRole.role)),
                subqueryload(User.programs).options(subqueryload(ProgramUser.program)),
            )
            .first()
        )

    cast(User, user).load_permissions()

    return ApiResponse(data=[cast(User, user).to_dict()])


@router.get("")
def get_all_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    subquery = select(Organisation.id).filter(
        or_(
            Organisation.id == user.organisation_id,
            Organisation.parent_id == user.organisation_id,
        )
    )

    query = (
        db.query(User)
        .filter(User.organisation_id.in_(subquery))
        .options(
            subqueryload(User.roles).options(subqueryload(UserRole.role)),
            subqueryload(User.organisation),
            subqueryload(User.programs),
        )
        .all()
    )

    return ApiResponse(data=query)


@router.get("/invitations")
def get_invitations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get all user invitations for the organisation"""

    subquery = select(Organisation.id).filter(
        or_(
            Organisation.id == user.organisation_id,
            Organisation.parent_id == user.organisation_id,
        )
    )

    query = (
        db.query(Invitation)
        .filter(Invitation.organisation_id.in_(subquery))
        .options(
            subqueryload(Invitation.organisation),
        )
        .all()
    )

    return ApiResponse(data=query)


@router.post("/invitations")
def invite_user(
    dto: InvitationDto,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Invite a user to the organisation. This will create a user in the cognito
    user pool and save the user to invitations table
    """

    client = boto3.client("cognito-idp", region_name=AWS_REGION)

    invitation = db.query(Invitation).filter(Invitation.email == dto.email).first()
    if invitation is not None:
        try:
            # Delete existing user since it is not confirmed
            response = client.admin_delete_user(
                UserPoolId=config.user_pool_id, Username=invitation.email
            )
            db.delete(invitation)
            db.commit()
        except Exception as e:
            capture_exception(e)
            pass

    invitation = Invitation()
    invitation.id = generate_uuid()
    invitation.created_at = func.now()
    invitation.updated_at = func.now()
    invitation.first_name = dto.first_name
    invitation.last_name = dto.last_name
    invitation.email = dto.email
    invitation.status = "PENDING"
    invitation.organisation_id = (
        user.organisation_id if dto.organisation_id is None else dto.organisation_id
    )
    # TODO: Add phone number

    db.add(invitation)
    db.commit()

    response = client.admin_create_user(
        UserPoolId=config.user_pool_id,
        Username=dto.email,
        # TemporaryPassword=dto.password,
        DesiredDeliveryMediums=["EMAIL"],
        UserAttributes=[
            {"Name": "email", "Value": dto.email},
            {"Name": "name", "Value": f"{dto.first_name} {dto.last_name}"},
        ],
        # MessageAction="RESEND",
    )

    print(response)
    # TODO: Write a db query to save the user to the database

    return get_invitations(user=user, db=db)


@router.delete("/invitations/{email}")
def delete_invitation(
    email: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    invitation = db.query(Invitation).filter(Invitation.email == email).first()
    client = boto3.client("cognito-idp", region_name=AWS_REGION)

    if invitation is not None:
        try:
            # Delete existing user since it is not confirmed
            response = client.admin_delete_user(
                UserPoolId=config.user_pool_id, Username=invitation.email
            )
            db.delete(invitation)
            db.commit()
        except Exception as e:
            capture_exception(e)
            pass

        db.delete(invitation)
        db.commit()

    return get_invitations(user=user, db=db)
