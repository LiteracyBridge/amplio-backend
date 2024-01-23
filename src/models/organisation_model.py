from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import BaseModel
from models.timestamps_model import SoftDeleteMixin, TimestampMixin


class Organisation(BaseModel):
    __tablename__ = "organisations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organisations.id"))

    parent: Mapped[Optional["Organisation"]] = relationship(
        "Organisation", remote_side=[id]
    )
    children: Mapped[Optional["Organisation"]] = relationship(
        "Organisation", remote_side=[parent_id]
    )
