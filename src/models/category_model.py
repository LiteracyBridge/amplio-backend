from typing import Optional

from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models import Project
from database import BaseModel


class SupportedCategory(BaseModel):
    __tablename__ = "supportedcategories"

    code: Mapped[str] = mapped_column("categorycode", String, primary_key=True)
    parent_category: Mapped[str] = mapped_column(
        "parentcategory",
        String,
        ForeignKey("supportedcategories.categorycode"),
        nullable=True,
    )
    is_leaf: Mapped[bool] = mapped_column("isleafnode", Boolean, nullable=False)
    name: Mapped[str] = mapped_column("categoryname", String, nullable=False)
    full_name: Mapped[str] = mapped_column("fullname", String, nullable=False)
