from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import JSON, Boolean, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from sqlalchemy.sql import func

from database import BaseModel
from models.content_metadata_model import ContentMetadata
from models.recipient_model import Recipient


class UserFeedbackMessage(BaseModel):
    __tablename__ = "uf_messages"

    message_uuid = mapped_column(String, primary_key=True, index=True)
    program_id: Mapped[str] = mapped_column("programid", String)
    deployment_number: Mapped[str] = mapped_column("deploymentnumber", String)
    language: Mapped[str] = mapped_column(String, default="en")
    length_seconds: Mapped[int] = mapped_column(Integer, nullable=True)
    length_bytes: Mapped[int] = mapped_column(Integer, nullable=True)
    transcription: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_useless: Mapped[bool] = mapped_column(Boolean, default=False)
    relation = mapped_column(String, nullable=True)
    recipient_id: Mapped[str] = mapped_column("recipientid", String, nullable=True)

    content_metadata: Mapped[ContentMetadata] = relationship(
        "ContentMetadata",
        primaryjoin="and_(foreign(ContentMetadata.content_id) == UserFeedbackMessage.relation)",
        viewonly=True,
    )
    recipient: Mapped[Recipient] = relationship(
        "Recipient",
        primaryjoin="and_(foreign(Recipient.id) == UserFeedbackMessage.recipient_id)",
        viewonly=True,
    )
