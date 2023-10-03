from typing import Dict, List, Optional
from sqlalchemy import (
    JSON,
    DateTime,
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    Text,
    null,
)
from sqlalchemy.orm import relationship, mapped_column, synonym
from sqlalchemy.orm import Mapped
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.sql import func
from sqlalchemy_easy_softdelete.mixin import generate_soft_delete_mixin_class
from datetime import datetime
from database import Base, SessionLocal, engine
from config import settings


class SoftDeleteMixin(generate_soft_delete_mixin_class()):
    deleted_at: datetime


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    projectcode = mapped_column(String, nullable=False, unique=True)



# # Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
