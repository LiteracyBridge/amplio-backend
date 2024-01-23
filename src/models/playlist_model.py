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
    func,
    select,
)
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship, validates

from database import BaseModel, SessionLocal
from models.message_models import Message


class Playlist(BaseModel):
    __tablename__ = "playlists"
    __table_args__ = (
        UniqueConstraint(
            "program_id", "deployment_id", "position", name="playlist_uniqueness_key"
        ),
        UniqueConstraint(
            "program_id",
            "deployment_id",
            "title",
            name="playlist_title_uniqueness_key",
        ),
        ForeignKeyConstraint(
            ["program_id"],
            ["projects.projectcode"],
            name="playlist_program_code_fkey",
        ),
        ForeignKeyConstraint(
            ["deployment_id"],
            ["deployments.id"],
            name="playlist_deployment_fkey",
            ondelete="CASCADE",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        nullable=False,
        autoincrement=True,
    )
    program_id = Column(String, primary_key=True, index=True, nullable=False)
    deployment_id = Column(Integer, nullable=False)
    position = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    audience = Column(String)

    messages: Mapped[List[Message]] = relationship(
        "Message",
        # passive_deletes=True,
        # order_by="Message.position",
    )

    def __init__(self, **kwargs):
        """
        Set default value for position and title
        """

        # TODO: optimize this
        query = (
            select([func.coalesce(func.max(Playlist.position), 0)])
            .where(Playlist.program_id == kwargs["program_id"])
            .where(Playlist.deployment_id == kwargs["deployment_id"])
        )

        position = SessionLocal.execute(query).scalar() + 1
        kwargs["position"] = position
        kwargs["title"] = f"Playlist {position}"

        super(Playlist, self).__init__(**kwargs)
