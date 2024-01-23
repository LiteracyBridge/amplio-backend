from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import BaseModel
from models.program_model import Project

# class SupportedLanguage(BaseModel):
#     __tablename__ = "supportedlanguages"

#     code: Mapped[str] = mapped_column("languagecode", String, primary_key=True)
#     name: Mapped[str] = mapped_column("languagename", String, nullable=False)
#     comments: Mapped[Optional[str]] = mapped_column(String)


class ProjectLanguage(BaseModel):
    __tablename__ = "languages"

    code: Mapped[str] = mapped_column("languagecode", String, primary_key=True)
    name: Mapped[str] = mapped_column("language", String, nullable=False)
    projectcode: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("projects.projectcode"), nullable=False, primary_key=True
    )

    project: Mapped[Project] = relationship("Project")


class Language(BaseModel):
    __tablename__ = "supportedlanguages"

    code = mapped_column("languagecode", String, primary_key=True)
    name = mapped_column("languagename", String, nullable=False)
    comments = mapped_column(String)
