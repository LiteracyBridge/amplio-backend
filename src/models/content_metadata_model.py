from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import JSON, Boolean, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from sqlalchemy.sql import func

from database import BaseModel


class ContentMetadata(BaseModel):
    __tablename__ = "contentmetadata2"

    project: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    content_id: Mapped[str] = mapped_column(
        "contentid", String, primary_key=True, index=True
    )
    title: Mapped[str] = mapped_column(String)
    source: Mapped[str] = mapped_column(String)
    language_code: Mapped[str] = mapped_column("languagecode", String)
