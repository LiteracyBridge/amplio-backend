from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import BaseModel, SessionLocal
from models.timestamps_model import SoftDeleteMixin, TimestampMixin
from models.organisation_model import Organisation


class Role(BaseModel, SoftDeleteMixin, TimestampMixin):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    permissions: Mapped[Dict[str, List[str]]] = mapped_column(JSONB, nullable=False)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))

    organisation: Mapped[Organisation] = relationship("Organisation")
