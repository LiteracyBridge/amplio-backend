from datetime import datetime
from typing import Annotated, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session, subqueryload

from models import Role, User, current_user, get_db
from models.user_model import UserRole
from routes.users.users_route import get_all_users
from schema import ApiResponse
from utilities.permissions import PERMISSIONS_TEMPLATE

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
def create_role(
    body: NewRoleDto, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    """Create a new role"""

    role: Role = Role()
    role.name = body.name
    role.permissions = body.permissions
    role.description = body.description
    role.organisation_id = user.organisation_id
    role.updated_at = datetime.now()
    role.created_at = datetime.now()

    db.add(role)
    db.commit()

    return get_roles(user=user, db=db)


@router.post("/assign")
def assign_or_update_roles(
    user_id: Annotated[int, Body()],
    roles: Annotated[List[int], Body()],
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Assign or update user roles"""

    existing_user = (
        db.query(User)
        .filter(User.id == user_id)
        .options(subqueryload(User.roles))
        .first()
    )
    if existing_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    existing_roles: List[int] = list(
        map(lambda role: role.role_id, existing_user.roles)
    )

    # Create a new roles for the user
    for role_id in roles:
        if role_id not in existing_roles:
            user_role = UserRole()
            user_role.user_id = user_id
            user_role.role_id = role_id

            db.add(user_role)

    # Remove roles that are not in the new list
    deleted_roles = list(filter(lambda role_id: role_id not in roles, existing_roles))

    db.query(UserRole).filter(
        UserRole.role_id.in_(deleted_roles), UserRole.user_id == user_id
    ).delete()
    db.commit()

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
        .filter(Role.id == role_id, Role.organisation_id == user.organisation_id)
        .first()
    )
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    db.delete(role)
    db.commit()

    return get_roles(user=user, db=db)


@router.get("/template")
def get_template():
    return ApiResponse(data=[PERMISSIONS_TEMPLATE])
