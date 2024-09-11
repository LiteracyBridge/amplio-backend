from typing import List, Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship, subqueryload
from sqlalchemy.types import UUID

from database import BaseModel, get_db
from jwt_verifier import USER_CACHE, VERIFIED_JWT_CLAIMS_CACHE
from models.organisation_model import Organisation
from models.program_model import Program
from models.role_model import Role
from models.timestamps_model import SoftDeleteMixin, TimestampMixin


class UserRole(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "user_roles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))

    user: Mapped["User"] = relationship("User", back_populates="roles")
    role: Mapped[Role] = relationship("Role")


class User(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))

    organisation: Mapped[Organisation] = relationship("Organisation")
    roles: Mapped[List[UserRole]] = relationship("UserRole", back_populates="user")
    programs: Mapped[List["ProgramUser"]] = relationship(
        "ProgramUser", back_populates="user"
    )

    permissions: dict[str, bool] = {}  # Map for permission { "action": True/False }

    def to_dict(self):
        user_dict = {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone_number": self.phone_number,
            "organisation_id": self.organisation_id,
            "permissions": self.permissions,
            "organisation": self.organisation,
            "roles": self.roles,
            "programs": self.programs,
        }

        return user_dict

    def load_permissions(self):
        # Parse roles into a map of permissions that can be used to check permissions in the UI
        for role in self.roles:
            for _, actions in role.role.permissions.items():
                for action in actions:
                    self.permissions[action] = True

        return self.permissions


class ProgramUser(TimestampMixin, BaseModel):
    __tablename__ = "program_users"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), primary_key=True)

    user: Mapped[User] = relationship("User", back_populates="programs")
    program: Mapped[Program] = relationship("Program", back_populates="users")


class Invitation(TimestampMixin, SoftDeleteMixin, BaseModel):
    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(UUID, primary_key=True, index=True)
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

        return user


def current_user(request: Request) -> User:
    """Returns the current user object from the request object"""

    return request.state.current_user
