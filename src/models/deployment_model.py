from datetime import date, datetime
from enum import Enum
from typing import List

from dateutil.relativedelta import relativedelta
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship, validates

from database import BaseModel
from models.playlist_model import Playlist


class Deployment(BaseModel):
    __tablename__ = "deployments"
    __table_args__ = (
        UniqueConstraint(
            "project",
            "deployment",
            name="deployments_uniqueness_key",
        ),
        ForeignKeyConstraint(
            ["project"],
            ["projects.projectcode"],
            name="deployment_program_code_fkey",
        ),
    )

    id = mapped_column(Integer, primary_key=True)
    program_id = mapped_column("project", String(255), index=True, nullable=False)
    deploymentname = mapped_column(String, nullable=False)
    deploymentnumber = mapped_column(Integer, nullable=False)
    deployment = mapped_column("deployment", String(255), nullable=False)
    start_date = mapped_column("startdate", Date)
    end_date = mapped_column("enddate", Date)
    distribution = mapped_column(String(255))
    comment = mapped_column(String)
    component = mapped_column(String, nullable=False)

    playlists: Mapped[List[Playlist]] = relationship("Playlist")
