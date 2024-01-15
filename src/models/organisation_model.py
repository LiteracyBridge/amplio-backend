from typing import Optional

from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import BaseModel
from models.timestamps_model import SoftDeleteMixin, TimestampMixin


class Organisation(BaseModel, SoftDeleteMixin, TimestampMixin):
    __tablename__ = "organisations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)


# TODO: define user model

# TODO: use alembic to create migration for user model -- see https://alembic.sqlalchemy.org/en/latest/tutorial.html
