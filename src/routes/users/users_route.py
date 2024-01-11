from typing import Optional
from botocore.utils import email
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from config import AWS_REGION, config
from models import get_db
import boto3
from models import Invitation
from schema import ApiResponse

router = APIRouter()


class InvitationDto(BaseModel):
    first_name: str
    last_name: str
    email: str
    other_names: Optional[str] = None
    # password: str


@router.get("")
def get_users(db: Session = Depends(get_db)):
    # TODO: Write a db query to fetch all users of the organization

    # TODO: Replace return statement with the db query
    return ApiResponse(
        data=[
            {
                "id": 1,
                "first_name": "John",
                "last_name": "Doe",
                "email": "johndoe@example.com",
                "other_names": "Walker Stones",
            },
            {
                "id": 2,
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "doemark@example.com",
                "other_names": "Walker Stones",
            },
        ]
    )


@router.post("/invitations")
def invite_user(dto: InvitationDto, db: Session = Depends(get_db)):
    client = boto3.client(
        "cognito-idp", region_name=AWS_REGION, endpoint_url=config.user_pool_endpoint
    )

    last_name = dto.last_name
    if dto.other_names is not None:
        last_name += " " + dto.other_names

    invitation: Invitation = Invitation()
    invitation.first_name = dto.first_name
    invitation.last_name = dto.last_name
    invitation.email = dto.email
    invitation.status = "PENDING"
    invitation.organisation_id = 1 # TODO: retrieve organisation id from the request headers/logged in user
    db.add(invitation)
    db.commit()

    response = client.admin_create_user(
        UserPoolId=config.user_pool_client_id,
        Username=dto.email,
        # TemporaryPassword=dto.password,
        DesiredDeliveryMediums=["EMAIL"],
        UserAttributes=[
            {"Name": "email", "Value": dto.email},
            {"Name": "first_name", "Value": dto.first_name},
            {"Name": "last_name", "Value": last_name},
        ],
        MessageAction="RESEND",
    )

    print(response)
    # TODO: Write a db query to save the user to the database

    return ApiResponse(data=[response.get("User")])
