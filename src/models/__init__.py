from datetime import datetime
from sqlalchemy.engine import create
from models.project_model import Project
from sqlalchemy_easy_softdelete.mixin import generate_soft_delete_mixin_class
from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional


class SoftDeleteMixin(generate_soft_delete_mixin_class()):
    deleted_at: datetime
    created_at: datetime


class TimestampMixin:
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )
    deleted_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


# # Then in your models
# class MyModel(Base, TimestampMixin):
#     # Your model fields here
