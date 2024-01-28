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
from sqlalchemy.sql import func

from database import BaseModel


class Choice(BaseModel):
    __tablename__ = "uf_choices"

    choice_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    choice_list: Mapped[str]
    choice_label: Mapped[str]
    value: Mapped[str] = mapped_column(String, nullable=True)
    order: Mapped[int] = mapped_column(Integer)

    is_other: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("uf_questions.id", ondelete="CASCADE")
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("uf_choices.choice_id", ondelete="CASCADE"), nullable=True
    )

    sub_options: Mapped[List["Choice"]] = relationship(
        "Choice", cascade="all, delete-orphan", foreign_keys=[parent_id]
    )
