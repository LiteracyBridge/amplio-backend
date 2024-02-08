from typing import Optional

import boto3 as boto3
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, subqueryload

from models import Analysis
from models import UserFeedbackMessage as Message
from models import get_db
from models.uf_message_model import UserFeedbackMessage
from schema import ApiResponse

MINIMUM_SECONDS_FILTER = 0  # filters out any UF messages of less than this # of seconds
MAXIMUM_MINUTES_CHECKOUT = 5  # re-issues the same UUID after this many minutes if the form hasn't yet been submitted

router = APIRouter()


@router.get("/{program_id}")
def lambda_handler(
    program_id: str,
    deployment: str,
    language: str,
    message_id: Optional[str] = None,
    skipped_messages: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if deployment is None and language is None:
        HTTPException(status_code=400, detail="Missing required parameters")

    skip: list[str] = []
    if skipped_messages is None or skipped_messages == "null" or skipped_messages == "":
        skip = []
    else:
        skip = skipped_messages.split(",")

    # If message id is provided, only query for that message and return it
    if message_id is not None and message_id != "null":
        result = (
            db.query(UserFeedbackMessage)
            .where(
                UserFeedbackMessage.message_uuid == message_id,
                UserFeedbackMessage.language == language,
                UserFeedbackMessage.program_id == program_id,
            )
            .options(
                subqueryload(UserFeedbackMessage.recipient),
                subqueryload(UserFeedbackMessage.content_metadata),
            )
            .first()
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Message not found")

        return ApiResponse(data=[result])

    subquery = select(Analysis.message_uuid).where(
        Analysis.message_uuid == Message.message_uuid
    )

    result = (
        db.query(Message)
        .where(
            Message.program_id == program_id,
            Message.deployment_number == deployment,
            Message.language == language,
            Message.length_seconds >= MINIMUM_SECONDS_FILTER,
            Message.message_uuid.notin_(skip),
            Message.message_uuid.not_in(subquery),
            Message.is_useless == None,
        )
        .options(
            subqueryload(UserFeedbackMessage.recipient),
            subqueryload(UserFeedbackMessage.content_metadata),
        )
        .order_by(Message.message_uuid)
        .first()
    )

    data = [result] if result is not None else []
    return ApiResponse(data=data)
