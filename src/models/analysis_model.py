from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from sqlalchemy.sql import func

from database import BaseModel
from models.timestamps_model import SoftDeleteMixin, TimestampMixin
from models.uf_choice_model import Choice
from models.uf_message_model import UserFeedbackMessage
from models.uf_question_model import Question


class AnalysisChoice(BaseModel, SoftDeleteMixin):
    __tablename__ = "uf_analysis_choices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    choice_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("uf_choices.choice_id", ondelete="CASCADE"), nullable=True
    )
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("uf_analysis.id", ondelete="CASCADE")
    )

    choice: Mapped[Optional[Choice]] = relationship("Choice")


class Analysis(BaseModel, SoftDeleteMixin):
    __tablename__ = "uf_analysis"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # is_useless: Mapped[bool] = mapped_column(Boolean, default=False)
    message_uuid: Mapped[str] = mapped_column(ForeignKey("uf_messages.message_uuid"))
    analyst_email: Mapped[str] = mapped_column(String)
    start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    submit_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    """
    If option is selected, then response is the choice's value,
    else response is the user provided text
    """
    response: Mapped[str] = mapped_column(String, nullable=True)

    # TODO: drop tis column
    # choice_id: Mapped[Optional[int]] = mapped_column(
    #     ForeignKey("uf_choices.choice_id", ondelete="CASCADE"), nullable=True
    # )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("uf_questions.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )
    # deleted_at: Mapped[Optional[DateTime]] = mapped_column(
    #     DateTime(timezone=True), nullable=True
    # )

    # Relationships
    question: Mapped[Question] = relationship("Question", back_populates="analysis")
    message: Mapped[UserFeedbackMessage] = relationship("UserFeedbackMessage")
    choices: Mapped[List[AnalysisChoice]] = relationship("AnalysisChoice")
