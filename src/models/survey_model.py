from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    null,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from database import BaseModel
from models.deployment_model import Deployment
from models.timestamps_model import SoftDeleteMixin
from models.uf_question_model import Question


class SurveySection(BaseModel, SoftDeleteMixin):
    __tablename__ = "uf_survey_sections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, default="Untitled Section")
    survey_id: Mapped[int] = mapped_column(
        ForeignKey("uf_surveys.id", ondelete="CASCADE"), nullable=True
    )


class Survey(BaseModel, SoftDeleteMixin):
    __tablename__ = "uf_surveys"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str]
    description: Mapped[Optional[str]]
    project_code: Mapped[str] = mapped_column()

    # TODO: Remove deployment_id and language cols
    deployment_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("deployments.id", ondelete="CASCADE"), nullable=True
    )
    language: Mapped[Optional[str]] = mapped_column(String, default="en", nullable=True)

    deployment: Mapped[Deployment] = relationship("Deployment")
    questions: Mapped[List[Question]] = relationship("Question")
    sections: Mapped[List[SurveySection]] = relationship("SurveySection")
    status: Mapped[str] = mapped_column(String, nullable=True, default="draft")
