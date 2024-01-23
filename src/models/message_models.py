from sqlalchemy import (
    Column,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, select

from database import BaseModel, SessionLocal, get_db


class MessageLanguages(BaseModel):
    __tablename__ = "message_languages"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(
        Integer,
        ForeignKey(
            "messages.id",
            name="message_languages_message_id_fkey",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    language_code = Column(
        String,
        ForeignKey(
            "supportedlanguages.languagecode",
            name="message_languages_language_code_fkey",
        ),
        nullable=False,
    )


class Message(BaseModel):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint(
            "program_id", "playlist_id", "position", name="message_uniqueness_key"
        ),
        UniqueConstraint(
            "program_id", "playlist_id", "title", name="message_title_uniqueness_key"
        ),
        ForeignKeyConstraint(
            ["program_id", "playlist_id"],
            ["playlists.program_id", "playlists.id"],
            name="message_program_id_fkey",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["default_category_code"],
            ["supportedcategories.categorycode"],
            name="message_category_fkey",
        ),
        ForeignKeyConstraint(
            ["sdg_goal_id"],
            ["sdg_goals.sdg_goal_id"],
            name="message_sdg_goal_fkey",
        ),
        ForeignKeyConstraint(
            ["sdg_goal_id", "sdg_target"],
            [
                "sdg_targets.sdg_goal_id",
                "sdg_targets.sdg_target",
            ],
            name="message_sdg_target_fkey",
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
    playlist_id = Column(Integer, nullable=False)
    position = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    format = Column(String)
    default_category_code = Column(String)
    variant = Column(String)
    sdg_goal_id = Column(Integer, ForeignKey("sdg_goals.sdg_goal_id"))
    sdg_target_id = Column("sdg_target", String)
    key_points = Column(String)

    languages = relationship(
        "Language",
        secondary=MessageLanguages.__tablename__,
        cascade="all, delete",
        # order_by="Language.name",
    )

    # sdg_goal_id_rel = relationship(
    #     'SustainableDevelopmentGoals'
    # )
    # sdg_target_rel = relationship(
    #     'SustainableDevelopmentTargets',
    #     viewonly=True,
    #     primaryjoin="and_ (Message.sdg_goal_id==sdg_targets.sdg_goal_id,"
    #     "Message.sdg_target_id==sdg_targets.sdg_target)"
    # )

    category = relationship("SupportedCategory")

    def __init__(self, **kwargs):
        """
        Set default value for position and title
        """
        query = (
            select([func.coalesce(func.max(Message.position), 0)])  # type: ignore
            .where(Message.program_id == kwargs["program_id"])
            .where(Message.playlist_id == kwargs["playlist_id"])
        )

        db = next(get_db())

        results = db.execute(query).scalar()
        position = results + 1 if results else 1
        kwargs["position"] = position
        kwargs["title"] = f"Message {position}"

        super(Message, self).__init__(**kwargs)
