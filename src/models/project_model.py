# from sqlalchemy_easy_softdelete.mixin import generate_soft_delete_mixin_class
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    String,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from database import BaseModel, SessionLocal


class Project(BaseModel):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code = mapped_column("projectcode", String, nullable=False, unique=True)
    name = mapped_column("project", String, nullable=False)
    active = mapped_column(Boolean, nullable=False, default=True)
