from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Dict, Optional, List
from models import get_db
from models import User, Role
from routes.program_spec.db import _ensure_content_view
from routes.users.roles_template import ROLES_TEMPLATE
from schema import ApiResponse
from utilities.rolemanager.role_checker import current_user, current_user2


router = APIRouter()


class NewRoleDto(BaseModel):
    name: str
    permissions: Dict[str, List[str]]  # {"module": [permissions]}
    description: Optional[str]


@router.get("")
def get_roles(user: User = Depends(current_user2), db: Session = Depends(get_db)):
    """Returns list of roles for the current user's organisation"""

    return ApiResponse(
        data=jsonable_encoder(
            db.query(Role).filter(Role.organisation_id == user.organisation_id).all()
        )
    )


@router.post("")
def crate_roles(
    body: NewRoleDto, db: Session = Depends(get_db), user: User = Depends(current_user2)
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


@router.get("/template")
def get_template(db: Session = Depends(get_db)):
    return ApiResponse(data=[ROLES_TEMPLATE])
