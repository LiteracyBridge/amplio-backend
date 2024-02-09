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

    if (message_id is not None) or message_id != "null":
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

    # Map the questions into the form {question_id: index}
    rows = []
    questions_cols_start_index = 5  # Index of the first question column
    rows.append(
        ["Message", "Transcription", "District", "Community", "Group"]
        + [q.question_label for q in questions]
    )

    mapped = {
        f"{q.id}": index + questions_cols_start_index
        for index, q in enumerate(questions)
    }

    # Group analysis by message_uuid
    grouped_analysis = [
        list(g) for _, g in itertools.groupby(analysis, key=lambda a: a.message_uuid)
    ]

    # Create a row for each message, corresponding to the questions index
    questions_count = len(questions) + questions_cols_start_index

    for messages in grouped_analysis:
        sorted_items = sorted(messages, key=lambda a: a.question_id)
        row = [None] * questions_count

        for a in sorted_items:
            value = a.response

            if len(a.choices) > 0:
                value = ", ".join([c.choice.value for c in a.choices])

            row[1] = a.message.transcription
            row[mapped[str(a.question_id)]] = value

            if a.message.content_metadata is not None:
                row[0] = a.message.content_metadata.title

            if a.message.recipient is not None:
                row[2] = a.message.recipient.district
                row[3] = a.message.recipient.community_name
                row[4] = a.message.recipient.group_name

        rows.append(row)

    return ApiResponse(data=rows)
