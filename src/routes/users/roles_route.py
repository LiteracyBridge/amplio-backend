import re
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Annotated, Any, Dict, Optional, Tuple, List, Union, Pattern
from models import SupportedCategory, get_db
import boto3 as boto3
import asyncio
from concurrent import futures
from models import User, Role
from routes.program_spec.db import _ensure_content_view
from routes.users.roles_template import ROLES_TEMPLATE
from schema import ApiResponse
from utilities.rolemanager.role_checker import current_user, current_user2
from utilities.rolemanager import manager
from utilities.rolemanager.rolesdb import RolesDb


router = APIRouter()


class NewRoleDto(BaseModel):
    name: str
    permissions: Dict[str, List[str]]  # {"module": [permissions]}
    description: Optional[str]


# Create a new role
@router.post("")
def crate_roles(
    body: NewRoleDto, db: Session = Depends(get_db), user: User = Depends(current_user2)
):
    role: Role = Role()
    role.name = body.name
    role.permissions = body.permissions
    role.description = body.description
    role.organisation_id = user.organisation_id

    db.add(role)
    db.commit()

    return ApiResponse(data=[role])


@router.get("/template")
def get_template(db: Session = Depends(get_db)):
    return ApiResponse(data=[ROLES_TEMPLATE])


@router.get("")
def get_roles(db: Session = Depends(get_db)):
    # TODO: Write a db query to fetch all roles of the organization

    # TODO: Replace return statement with the db query
    return ApiResponse(
        data=[
            {
                "id": 1,
                "name": "Admin",
                "permissions": [
                    {"module": ["permission-1", "permission-2", "permission-3"]},
                    {"module-2": ["permission-1", "permission-2", "permission-3"]},
                    {"acm_tbloader": ["can-create-deployment", "can-update-playlist"]},
                ],
            }
        ]
    )


# @router.post("")
# def crate_roles(db: Session = Depends(get_db)):
#     # TODO: Write a db query to create a new role
#     pass
