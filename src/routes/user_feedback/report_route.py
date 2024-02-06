import enum
import itertools
import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from openpyxl import Workbook
from pg8000 import IntegrityError
from pydantic import BaseModel
from sentry_sdk import capture_exception
from sqlalchemy import and_, exists, text
from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy.sql import select

from models import Analysis, AnalysisChoice, Question
from models import UserFeedbackMessage as Message
from models import get_db
from models.uf_message_model import UserFeedbackMessage
from routes.user_feedback.uf_messages_route import get_uuid_metadata
from schema import ApiResponse

router = APIRouter()


@router.get("/{survey_id}")
def get_report(
    survey_id: int,
    request: Request,
    deployment: str,
    language: str,
    db: Session = Depends(get_db),
):
    analysis = (
        db.query(Analysis)
        .join(
            Message,
            and_(
                Message.message_uuid == Analysis.message_uuid,
                Message.deploymentnumber == deployment,
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
        .all()
    )

    # To execute the query and get all results:
    # results = query.all()
    # analysis = (
    #     db.query(Analysis)
    #     .filter(
    #         Analysis.question_id.in_(
    #             # select(
    #             db.query(Question.id)
    #             .filter(Question.survey_id == survey_id)
    #             .subquery()
    #             # )
    #         ),
    #         messages_query,
    #     )
    #     .options(
    #         subqueryload(Analysis.message),
    #         subqueryload(Analysis.choices).options(subqueryload(AnalysisChoice.choice)),
    #         subqueryload(Analysis.question),
    #     )
    # )
    # print(analysis.statement)

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
    # analysis = sorted(analysis, key=lambda a: a.message_uuid)
    grouped_analysis = [
        list(g) for _, g in itertools.groupby(analysis, key=lambda a: a.message_uuid)
    ]

    # return analysis
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

    wb = Workbook()
    responses_sheet = wb.active
    responses_sheet.title = "Responses"

    for row in rows:
        responses_sheet.append(row)

    fp = os.path.join(tempfile.gettempdir(), "Analysis Report.xlsx")
    wb.save(fp)

    def iterfile():
        with open(fp, mode="rb") as f:
            yield from f

    # Return file as response
    # return FileResponse(fp, media_type=, filename='Analysis Report.xlsx')
    return StreamingResponse(
        iterfile(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        # filename="Analysis Report.xlsx",
        # content_disposition_type='attachment; filename="Analysis Report.xlsx"'
    )
