import re
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session
from typing import Annotated, Any, Dict, Optional, Tuple, List, Union, Pattern
from models import SupportedCategory, get_db
import boto3 as boto3
import asyncio
from concurrent import futures
from routes.program_spec.db import _ensure_content_view
from utilities.rolemanager.role_checker import current_user
from utilities.rolemanager import manager
from utilities.rolemanager.rolesdb import RolesDb


router = APIRouter()


@router.get("/supported")
def get_multi(db: Session = Depends(get_db)):
    return db.query(SupportedCategory).all()
