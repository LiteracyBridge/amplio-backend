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


class SupportedCategory(BaseModel):
    __tablename__ = "supportedcategories"

    code: Mapped[str] = mapped_column("categorycode", String, primary_key=True)
    parent_category: Mapped[str] = mapped_column(
        "parentcategory",
        String,
        ForeignKey("supportedcategories.categorycode"),
        nullable=True,
    )
    is_leaf: Mapped[bool] = mapped_column("isleafnode", Boolean, nullable=False)
    name: Mapped[str] = mapped_column("categoryname", String, nullable=False)
    full_name: Mapped[str] = mapped_column("fullname", String, nullable=False)


# # Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
