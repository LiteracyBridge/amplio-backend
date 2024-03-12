from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy_easy_softdelete.mixin import generate_soft_delete_mixin_class


class SoftDeleteMixin(generate_soft_delete_mixin_class()):
    deleted_at: datetime


class TimestampMixin:
    created_at: Mapped[datetime | DateTime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[datetime | DateTime] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )
