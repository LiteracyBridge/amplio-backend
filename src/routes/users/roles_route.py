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
from models import User, Role, current_user
from models.user_model import UserRole
from routes.program_spec.db import _ensure_content_view
from routes.users.roles_template import ROLES_TEMPLATE
from schema import ApiResponse
from routes.users.users_route import get_users

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
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Assign roles to a user"""

    role = (
        db.query(Role)
        .filter(Role.id == role_id and Role.organisation_id == user.organisation_id)
        .first()
    )
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    for user_id in users:
        existing_role = (
            db.query(UserRole)
            .filter(UserRole.user_id == user_id and UserRole.role_id == role_id)
            .first()
        )
        if existing_role is not None:
            continue

        user_role = UserRole()
        user_role.user_id = user_id
        user_role.role_id = role_id

        db.add(user_role)
        db.commit()

    return get_users(user=user, db=db)


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
        .filter(UserRole.user_id == user_id and UserRole.role_id == role_id)
        .first()
    )
    if existing_role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    db.delete(existing_role)
    db.commit()

    return get_users(user=user, db=db)


@router.get("/template")
def get_template(db: Session = Depends(get_db)):
    return ApiResponse(data=[ROLES_TEMPLATE])
