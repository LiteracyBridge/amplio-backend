from typing import List, Optional
from fastapi import Depends, HTTPException, Request

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship, subqueryload
from database import get_db
from models.program_model import Program
from models.role_model import Role
from models.timestamps_model import SoftDeleteMixin, TimestampMixin
from database import BaseModel
from models.organisation_model import Organisation
from jwt_verifier import VERIFIED_JWT_CLAIMS_CACHE


class ProgramUser(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "program_users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"))

    user: Mapped["User"] = relationship("User", back_populates="programs")
    program: Mapped[Program] = relationship("Program")


class UserRole(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "user_roles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    program_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("programs.id"), nullable=True
    )

    user: Mapped["User"] = relationship("User", back_populates="roles")
    role: Mapped[Role] = relationship("Role")
    program: Mapped[Program] = relationship("Program")


class User(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))

    organisation: Mapped[Organisation] = relationship("Organisation")
    roles: Mapped[List[UserRole]] = relationship("UserRole", back_populates="user")

    # TODO: a permissions field, similar to ts


class Invitation(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))

    organisation: Mapped[Organisation] = relationship("Organisation")

    @staticmethod
    def create_user(
        email: str,
        db: Session,
    ) -> User | None:
        """
        Create a new user from an invitation.

        The invitation is deleted after the user is created successfully.
        """

        invitation = db.query(Invitation).filter(Invitation.email == email).first()
        if invitation is None:
            return None

        user = User()
        user.first_name = invitation.first_name
        user.last_name = invitation.last_name
        user.email = invitation.email
        user.organisation_id = invitation.organisation_id

        db.add(user)
        db.delete(invitation)
        db.commit()

        return (
            db.query(User)
            .filter(User.email == user.email)
            .options(
                subqueryload(User.roles).options(subqueryload(UserRole.role)),
            )
            .first(),
        )


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Returns the current user object from the request object"""

    token: str = str(request.headers.get("Authorization").replace("Bearer ", ""))
    email = VERIFIED_JWT_CLAIMS_CACHE[token].get("email")

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized",
        )

    return user
