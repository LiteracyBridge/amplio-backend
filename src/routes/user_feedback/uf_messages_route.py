from itertools import count
from typing import Annotated, Optional

import boto3 as boto3
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, subqueryload
from sqlalchemy.sql.functions import random

from models import Analysis
from models import UserFeedbackMessage as Message
from models import get_db
from models.uf_message_model import UserFeedbackMessage
from schema import ApiResponse

MINIMUM_SECONDS_FILTER = 0  # filters out any UF messages of less than this # of seconds
MAXIMUM_MINUTES_CHECKOUT = 5  # re-issues the same UUID after this many minutes if the form hasn't yet been submitted

router = APIRouter()


@router.get("/{program_id}")
def get_message(
    program_id: str,
    deployment: str,
    language: str,
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


@router.get("/{program_id}/samples")
def get_message_samples(
    program_id: str,
    deployment: str,
    language: str,
    db: Session = Depends(get_db),
):
    if deployment is None and language is None:
        HTTPException(
            status_code=400,
            detail="Missing 'language' & 'deployment' required parameters",
        )

    total_messages = (
        db.query(UserFeedbackMessage)
        .where(
            UserFeedbackMessage.language == language,
            UserFeedbackMessage.program_id == program_id,
            Message.deployment_number == deployment,
        )
        .count()
    )

    # Limit results to 51% of the total messages
    limit = int(total_messages * 0.51)

    result = (
        db.query(UserFeedbackMessage)
        .where(
            UserFeedbackMessage.language == language,
            UserFeedbackMessage.program_id == program_id,
            Message.deployment_number == deployment,
        )
        .options(
            subqueryload(UserFeedbackMessage.recipient),
            subqueryload(UserFeedbackMessage.content_metadata),
        )
        .order_by(random())
        .limit(limit)
        .all()
    )

    return ApiResponse(data=result)


@router.post("/{program_id}/transcribe")
def transcribe_message(
    program_id: str,
    message_id: Annotated[str, Body(...)],
    transcription: Annotated[str, Body(...)],
    db: Session = Depends(get_db),
):
    message = (
        db.query(Message)
        .where(Message.message_uuid == message_id, Message.program_id == program_id)
        .first()
    )

    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    message.transcription = transcription
    db.commit()

    return ApiResponse(data=[message])
