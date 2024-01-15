from typing import List, Optional
from fastapi import Depends, HTTPException, Request

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship
from database import get_db
from models.role_model import Role
from models.timestamps_model import SoftDeleteMixin, TimestampMixin
from database import BaseModel
from models.organisation_model import Organisation
from jwt_verifier import VERIFIED_JWT_CLAIMS_CACHE


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
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))

    organisation: Mapped[Organisation] = relationship("Organisation")
    roles: Mapped[List[UserRole]] = relationship("UserRole", back_populates="user")


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
