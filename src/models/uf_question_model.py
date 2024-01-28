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
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from database import BaseModel
from models.uf_choice_model import Choice


class Question(BaseModel):
    __tablename__ = "uf_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # name: Mapped[str]
    order: Mapped[int] = mapped_column(Integer, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=True)
    question_label: Mapped[str] = mapped_column(String, nullable=True)
    # data: Mapped[str]
    # data_other: Mapped[Optional[str]]
    constraint: Mapped[Optional[str]]
    # relevant: Mapped[Optional[str]]
    default: Mapped[Optional[str]]
    hint: Mapped[Optional[str]]
    # TODO: change to JSONB
    choice_list: Mapped[Optional[str]]
    required: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    # TODO: do not use this field, use deployment_id instead from survey model
    deploymentnumber: Mapped[int]
    # TODO: Add timestamps

    # TODO:change to fkey
    section_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("uf_survey_sections.id", ondelete="CASCADE"), nullable=True
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("uf_questions.id", ondelete="CASCADE")
    )  # Replaces relevant
    survey_id: Mapped[int] = mapped_column(
        ForeignKey("uf_surveys.id", ondelete="CASCADE")
    )
    conditions: Mapped[Optional[Dict]] = mapped_column(
        MutableDict.as_mutable(JSON), nullable=True, default=None  # type: ignore
    )

    # Relationships
    choices: Mapped[List[Choice]] = relationship("Choice")
    analysis: Mapped[List["Analysis"]] = relationship("Analysis")  # type: ignore
