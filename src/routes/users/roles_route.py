import re
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session
from typing import Annotated, Any, Dict, Optional, Tuple, List, Union, Pattern
from models import SupportedCategory, get_db
import boto3 as boto3
import asyncio
from concurrent import futures
from routes.program_spec.db import _ensure_content_view
from schema import ApiResponse
from utilities.rolemanager.role_checker import current_user
from utilities.rolemanager import manager
from utilities.rolemanager.rolesdb import RolesDb


router = APIRouter()


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
