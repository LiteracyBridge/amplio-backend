from typing import Optional

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.timestamps_model import SoftDeleteMixin, TimestampMixin
from database import BaseModel
from models.organisation_model import Organisation


class Invitation(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    other_names: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))

    organisation: Mapped[Organisation] = relationship("Organisation")


class User(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    other_names: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))

    organisation: Mapped[Organisation] = relationship("Organisation")
