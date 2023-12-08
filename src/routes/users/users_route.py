from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db
import boto3 as boto3
from schema import ApiResponse
from routes.users import roles_route

router = APIRouter()

router.include_router(
    roles_route.router,
    prefix="/roles",
    tags=["user"],
    dependencies=[Depends(get_db)],
)


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
