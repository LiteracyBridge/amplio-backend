from typing import Annotated, Optional
from botocore.utils import email
from fastapi import APIRouter, Body, Depends, Request, HTTPException
from jwt_verifier import VERIFIED_JWT_CLAIMS_CACHE
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.orm import Session, subqueryload
from config import AWS_REGION, config
from models import get_db
import boto3
from models import Invitation
from models.user_model import User, UserRole, current_user
from schema import ApiResponse
from sentry_sdk import capture_exception

router = APIRouter()


class InvitationDto(BaseModel):
    first_name: str
    last_name: str
    email: str


@router.get("/me")
def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Returns the account info of the authenticated user.

    If the user does not exist, it tries to create a new user
    from the invitations table (if exists)
    """

    token: str = str(request.headers.get("Authorization").replace("Bearer ", ""))
    email = VERIFIED_JWT_CLAIMS_CACHE[token].get("email")

    user = (
        db.query(User)
        .filter(User.email == email)
        .options(
            subqueryload(User.roles).options(subqueryload(UserRole.role)),
        )
        .first()
    )

    if user is None:
        user = Invitation.create_user(db=db, email=email)

        if user is None:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized",
            )

    return ApiResponse(data=[user])


@router.get("")
def get_all_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return ApiResponse(
        data=db.query(User)
        .filter(User.organisation_id == user.organisation_id)
        .options(
            subqueryload(User.roles).options(subqueryload(UserRole.role)),
        )
        .all()
    )


@router.get("/invitations")
def get_invitations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get all user invitations for the organisation"""

    return ApiResponse(
        data=db.query(Invitation)
        .filter(Invitation.organisation_id == user.organisation_id)
        .all()
    )


@router.post("/invitations")
def invite_user(
    dto: InvitationDto,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Invite a user to the organisation. This will create a user in the cognito
    user pool and save the user to invitations table
    """

    client = boto3.client("cognito-idp", region_name=AWS_REGION)

    invitation = db.query(Invitation).filter(Invitation.email == dto.email).first()
    if invitation is not None:
        try:
            # Delete existing user since it is not confirmed
            response = client.admin_delete_user(
                UserPoolId=config.user_pool_id, Username=invitation.email
            )
            db.delete(invitation)
            db.commit()
        except Exception as e:
            capture_exception(e)
            pass

    invitation = Invitation()
    invitation.first_name = dto.first_name
    invitation.last_name = dto.last_name
    invitation.email = dto.email
    invitation.status = "PENDING"
    invitation.organisation_id = user.organisation_id
    # TODO: Add phone number

    db.add(invitation)
    db.commit()

    response = client.admin_create_user(
        UserPoolId=config.user_pool_id,
        Username=dto.email,
        # TemporaryPassword=dto.password,
        DesiredDeliveryMediums=["EMAIL"],
        UserAttributes=[
            {"Name": "email", "Value": dto.email},
            {"Name": "name", "Value": f"{dto.first_name} {dto.last_name}"},
        ],
        # MessageAction="RESEND",
    )

    print(response)
    # TODO: Write a db query to save the user to the database

    return get_invitations(user=user, db=db)


@router.delete("/invitations/{email}")
def delete_invitation(
    email: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    invitation = db.query(Invitation).filter(Invitation.email == email).first()

    if invitation is not None:
        try:
            # Delete existing user since it is not confirmed
            response = client.admin_delete_user(
                UserPoolId=config.user_pool_id, Username=invitation.email
            )
            db.delete(invitation)
            db.commit()
        except Exception as e:
            capture_exception(e)
            pass

        db.delete(invitation)
        db.commit()

    return get_invitations(user=user, db=db)
