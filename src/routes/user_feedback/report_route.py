import itertools
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import and_, select, text
from sqlalchemy.orm import Session, joinedload, subqueryload

from models import Analysis, AnalysisChoice, Question, Survey
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


@router.get("/{survey_id}/statistics")
def get_statistics(
    survey_id: int,
    email: str,
    language: str,
    deployment: str,
    db: Session = Depends(get_db),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")

    analysed_query = """
        WITH analysis AS (
            SELECT DISTINCT a.message_uuid, a.analyst_email, m.is_useless FROM uf_analysis a
            INNER JOIN uf_messages m ON m.message_uuid = a.message_uuid AND NOT m.test_deployment
                AND m.language = :language AND m.deploymentnumber = :deployment
            INNER JOIN uf_questions q ON q.survey_id = :survey_id AND q.id = a.question_id
        )
        SELECT
            (SELECT COUNT(*) FROM analysis WHERE analyst_email = :email) AS by_current_user,
            (SELECT count(*) FROM analysis) AS total_analysed,
            (
                SELECT COUNT(*) FROM uf_messages m WHERE NOT m.test_deployment
                AND m.language = :language AND m.deploymentnumber = :deployment AND is_useless
            ) AS total_useless,
            (
                SELECT COUNT(*) FROM uf_messages m WHERE NOT m.test_deployment
                AND m.language = :language AND m.deploymentnumber = :deployment
            ) AS total_messages;
    """
    results = db.execute(
        text(analysed_query),
        {
            "language": language,
            "email": email,
            "survey_id": survey_id,
            "deployment": deployment if deployment is not None else 1,
        },
    ).fetchall()

    data = {
        "by_current_user": results[0][0],
        "total_analysed": results[0][1],
        "total_useless": results[0][2],
        "total_messages": results[0][3],
    }
    return ApiResponse(data=[data])
