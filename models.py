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

# from sqlalchemy_easy_softdelete.mixin import generate_soft_delete_mixin_class
from datetime import datetime
from database import BaseModel, SessionLocal


# class SoftDeleteMixin(generate_soft_delete_mixin_class()):
#     deleted_at: datetime


class Project(BaseModel):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    projectcode = mapped_column(String, nullable=False, unique=True)


class SupportedLanguage(BaseModel):
    __tablename__ = "supportedlanguages"

    code: Mapped[str] = mapped_column("languagecode", String, primary_key=True)
    name: Mapped[str] = mapped_column("languagename", String, nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(String)


class ProjectLanguage(BaseModel):
    __tablename__ = "languages"

    code: Mapped[str] = mapped_column("languagecode", String, primary_key=True)
    name: Mapped[str] = mapped_column("language", String, nullable=False)
    projectcode: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("projects.projectcode"), nullable=False, primary_key=True
    )

    project: Mapped[Project] = relationship("Project")


# # Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
