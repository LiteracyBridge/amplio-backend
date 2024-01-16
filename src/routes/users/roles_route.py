from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Annotated, Dict, Optional, List
from models import get_db
from models import User, Role, current_user, Program
from models.user_model import ProgramUser, UserRole
from routes.users.roles_template import ROLES_TEMPLATE
from schema import ApiResponse
from routes.users.users_route import get_all_users

router = APIRouter()


class NewRoleDto(BaseModel):
    name: str
    permissions: Dict[str, List[str]]  # {"module": [permissions]}
    description: Optional[str]


@router.get("")
def get_roles(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Returns list of roles for the current user's organisation"""

    return ApiResponse(
        data=jsonable_encoder(
            db.query(Role).filter(Role.organisation_id == user.organisation_id).all()
        )
    )


@router.post("")
def crate_roles(
    body: NewRoleDto, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    """Create a new role"""

    role: Role = Role()
    role.name = body.name
    role.permissions = body.permissions
    role.description = body.description
    role.organisation_id = user.organisation_id

    db.add(role)
    db.commit()

    return get_roles(user=user, db=db)


@router.post("/assign")
def assign_role(
    users: Annotated[List[int], Body()],
    role_id: Annotated[int, Body()],
    program_id: Annotated[Optional[int], Body()],
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Assign roles to a user"""

    role = (
        db.query(Role)
        .filter(Role.id == role_id, Role.organisation_id == user.organisation_id)
        .first()
    )
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    existing_users = (
        db.query(User).filter(User.id.in_(users)).all()
    )
    for user in existing_users:
        user_role = UserRole()
        user_role.user_id = user.id
        user_role.role_id = role.id
        user_role.program_id = program_id

        db.add(user_role)
        db.commit()

        # Update the user's programs
        if program_id is not None:
            ProgramUser.add_user(user_id=user.id, program_id=program_id, db=db)

    return get_all_users(user=user, db=db)


@router.post("/revoke")
def revoke_role(
    user_id: Annotated[int, Body()],
    role_id: Annotated[int, Body()],
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Revoke role from a user"""

    existing_role = (
        db.query(UserRole)
        .filter(UserRole.user_id == user_id, UserRole.role_id == role_id)
        .first()
    )
    if existing_role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    existing_role.delete()
    db.commit()

    return get_all_users(user=user, db=db)


@router.delete("/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Permanently deletes a role from the database"""

    role = (
        db.query(Role)
        .filter(Role.id == role_id , Role.organisation_id == user.organisation_id)
        .first()
    )
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    db.delete(role)
    db.commit()

    return get_roles(user=user, db=db)


@router.get("/template")
def get_template(db: Session = Depends(get_db)):
    return ApiResponse(data=[ROLES_TEMPLATE])
