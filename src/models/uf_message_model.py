from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import JSON, Boolean, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from sqlalchemy.sql import func

from database import BaseModel


class UserFeedbackMessage(BaseModel):
    __tablename__ = "uf_messages"

    message_uuid = mapped_column(String, primary_key=True, index=True)
    programid: Mapped[str] = mapped_column(String)
    deploymentnumber: Mapped[str] = mapped_column(String)
    language: Mapped[str] = mapped_column(String, default="en")
    length_seconds: Mapped[int] = mapped_column(Integer, nullable=True)
    length_bytes: Mapped[int] = mapped_column(Integer, nullable=True)
    transcription: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_useless: Mapped[bool] = mapped_column(Boolean, default=False)
