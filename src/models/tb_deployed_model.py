from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import JSON, TIMESTAMP, Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, relationships
from sqlalchemy.sql import func

from database import BaseModel
from models.deployment_model import Deployment


class TalkingBookDeployed(BaseModel):
    __tablename__ = "tbsdeployed"

    talkingbook_id: Mapped[str] = mapped_column(
        "talkingbookid", String, primary_key=True
    )
    deployed_timestamp: Mapped[datetime] = mapped_column(
        "deployedtimestamp", TIMESTAMP, primary_key=True
    )
    recipient_id: Mapped[str] = mapped_column("recipientid", String, nullable=True)
    project: Mapped[str] = mapped_column(String, nullable=False)
    deployment_name: Mapped[str] = mapped_column(
        "deployment", String, nullable=False
    )  # This actually refers to the deployments.deployment column
    deployment_uuid: Mapped[str] = mapped_column(String, nullable=True)
    content_package: Mapped[str] = mapped_column(
        "contentpackage", String, nullable=True
    )

    deployment: Mapped[Deployment] = relationship(
        "Deployment",
        primaryjoin="and_(foreign(Deployment.deployment) == TalkingBookDeployed.deployment_name)",
        viewonly=True,
    )
