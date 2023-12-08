from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    String,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from database import BaseModel, SessionLocal
from models import SoftDeleteMixin, TimestampMixin


class Role(BaseModel, SoftDeleteMixin, TimestampMixin):
    __tablename__ = "roles"

    # TODO: define properties of role model


# TODO: use alembic to create migration for organisation model -- see https://alembic.sqlalchemy.org/en/latest/tutorial.html
# Example of a migration: alembic revision -m "create role table"
