import itertools
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload, subqueryload

from models import Analysis, AnalysisChoice, Question
from models import UserFeedbackMessage as Message
from models import get_db
from models.uf_message_model import UserFeedbackMessage
from schema import ApiResponse

router = APIRouter()


@router.get("/{survey_id}")
def get_report(
    survey_id: int,
    deployment: str,
    language: str,
    message_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Analysis)

    if (message_id is not None) and message_id != "null":
        query = query.filter(Analysis.message_uuid == message_id)

    query = (
        query.join(
            Message,
            and_(
                Message.message_uuid == Analysis.message_uuid,
                Message.deployment_number == deployment,
                Message.language == language,
            ),
        )
        .join(
            Question,
            and_(Question.id == Analysis.question_id, Question.survey_id == survey_id),
        )
        .options(
            subqueryload(Analysis.message).options(
                subqueryload(UserFeedbackMessage.recipient),
                subqueryload(UserFeedbackMessage.content_metadata),
            ),
            subqueryload(Analysis.choices).options(subqueryload(AnalysisChoice.choice)),
            subqueryload(Analysis.question),
        )
    )

    analysis = query.all()
    questions = db.query(Question).filter(Question.survey_id == survey_id).all()

    # Create row header, each header item must have unique key.
    # The key is used to create the row.
    # NOTE: This structure is used because https://www.npmjs.com/package/exceljs#rows
    # library used by the frontend
    excel_headers: list[dict] = [
        {"header": "Message", "key": "message"},
        {"header": "Transcription", "key": "transcription", "width": 30},
        {"header": "District", "key": "district"},
        {"header": "Community", "key": "community"},
        {"header": "Group", "key": "group"},
        {"header": "Region", "key": "region"},
        {"header": "Language", "key": "language"},
        {"header": "Agent", "key": "agent"},
    ]
    for q in questions:
        excel_headers.append({"header": q.question_label, "key": str(q.id)})

    excel_rows: list[dict] = []

    # Group analysis by message_uuid
    grouped_analysis = [
        list(g) for _, g in itertools.groupby(analysis, key=lambda a: a.message_uuid)
    ]

    # Create a row for each message, corresponding to the questions index
    for messages in grouped_analysis:
        sorted_items = sorted(messages, key=lambda a: a.question_id)
        _row: dict = {}

        for a in sorted_items:
            value = a.response

            # For multiple/single choice response, combine the response into one value
            if len(a.choices) > 0:
                value = ", ".join([c.choice.value for c in a.choices])  # type: ignore

            _row["transcription"] = a.message.transcription
            _row[a.question_id] = value  # Set response value

            if a.message.content_metadata is not None:
                _row["message"] = a.message.content_metadata.title  # type: ignore

            if a.message.recipient is not None:
                _row["district"] = a.message.recipient.district  # type: ignore
                _row["community"] = a.message.recipient.community_name  # type: ignore
                _row["group"] = a.message.recipient.group_name  # type: ignore
                _row["agent"] = a.message.recipient.agent  # type: ignore
                _row["language"] = a.message.recipient.language  # type: ignore

        excel_rows.append(_row)

    return ApiResponse(data=[{"headers": excel_headers, "rows": excel_rows}])
