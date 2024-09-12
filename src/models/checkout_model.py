from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import BaseModel
from models.program_model import Project
from models.timestamps_model import SoftDeleteMixin, TimestampMixin


class ACMCheckout(BaseModel):
    __tablename__ = "acm_checkout"

    id: Mapped[str] = mapped_column(UUID, primary_key=True, index=True)
    last_in_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_in_version: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_in_comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_in_contact: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    now_out_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    now_out_contact: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    now_out_date: Mapped[datetime | DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    now_out_version: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    now_out_comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    now_out_key: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    acm_comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    acm_state: Mapped[str] = mapped_column(String, nullable=False)
    last_in_file_name: Mapped[str] = mapped_column(String, nullable=False)
    last_in_date: Mapped[datetime | DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    project_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("projects.id"), unique=True
    )

    project: Mapped[Optional[Project]] = relationship("Project")
