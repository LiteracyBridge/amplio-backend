from typing import Optional

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models import Project
from database import BaseModel


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
