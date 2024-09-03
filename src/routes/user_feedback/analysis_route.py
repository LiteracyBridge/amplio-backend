from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pg8000 import IntegrityError
from pydantic import BaseModel
from sentry_sdk import capture_exception
from sqlalchemy import exists
from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy.sql import select

from models import Analysis, AnalysisChoice, Question, Survey
from models import UserFeedbackMessage as Message
from models import get_db
from models.uf_message_model import UserFeedbackMessage
from schema import ApiResponse

router = APIRouter()


# TODO: remove /analysis from the path
@router.post("/{survey_id}/analysis")
def get_analysis(survey_id: int, db: Session = Depends(get_db)):
    sub_query = db.query(Question.id).filter(Question.survey_id == survey_id).subquery()
    analysis = (
        db.query(Analysis).filter(Analysis.question_id.in_(select(sub_query))).all()
    )

    return ApiResponse(data=analysis)


@router.get("/{survey_id}/submissions")
def get_analysed_messages(
    survey_id: int, deployment: str, language: str, db: Session = Depends(get_db)
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")

    query = (
        db.query(UserFeedbackMessage)
        .filter(
            UserFeedbackMessage.program_id == survey.project_code,
            UserFeedbackMessage.language == language,
            UserFeedbackMessage.deployment_number == deployment,
            exists(Analysis).where(
                Analysis.message_uuid == UserFeedbackMessage.message_uuid
            ),
        )
        .options(
            subqueryload(UserFeedbackMessage.recipient),
            subqueryload(UserFeedbackMessage.content_metadata),
        )
        .all()
    )

    return ApiResponse(data=query)


@router.delete("/{survey_id}/submissions/{message_id}")
def delete_submission(survey_id: int, message_id: str, db: Session = Depends(get_db)):
    """Delete an analysis submission
    This also deletes the choices associated with the analysis
    """

    analysis = (
        db.query(Analysis)
        .filter(
            Analysis.message_uuid == message_id,
            exists(Question).where(
                Question.survey_id == survey_id, Question.id == Analysis.question_id
            ),
        )
        .all()
    )

    for item in analysis:
        db.delete(item)
        db.query(AnalysisChoice).filter(AnalysisChoice.analysis_id == item.id).delete()

    db.commit()

    return ApiResponse(data=[])


class AnalysisDto(BaseModel):
    questions: List[Dict[str, Any]] = []
    message_uuid: str
    analyst_email: str
    submit_time: datetime
    start_time: datetime
    transcription: Optional[str] = None
    is_useless: bool = False
    # Relevant only if the analysis is useless responses
    id: Optional[int] = None


def _save_choices(
    analysis: Analysis, choices: list[int], db: Session = Depends(get_db)
):
    # Save choices
    for choice_id in choices:
        if choice_id is None:
            continue

        analysis_choice = AnalysisChoice()
        is_new = True

        if str(choice_id).isdigit():
            result = (
                db.query(AnalysisChoice).filter(AnalysisChoice.id == choice_id).first()
            )

            if result is not None:
                analysis_choice = result
                is_new = False

        analysis_choice.analysis_id = analysis.id
        analysis_choice.choice_id = choice_id

        if is_new:
            db.add(analysis_choice)

        db.commit()


@router.post("/{survey_id}")
def save_or_create_analysis(
    survey_id: int, dto: AnalysisDto, db: Session = Depends(get_db)
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")

    # Update uf_message
    message = db.query(Message).filter(Message.message_uuid == dto.message_uuid).first()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    message.transcription = dto.transcription
    message.is_useless = dto.is_useless
    db.commit()

    print(dto.is_useless, dto.message_uuid, dto.transcription)

    if dto.is_useless:
        return get_analysis(survey_id=survey_id, db=db)

    #
    try:
        # Save responses
        for item in dto.questions:
            if item is None:
                continue

            analysis = Analysis()
            is_new = True

            if str(item.get("id", None)).isdigit():
                result = (
                    db.query(Analysis)
                    .filter(Analysis.id == int(item.get("id", -1)))
                    .first()
                )

                if result is not None:
                    analysis = result
                    is_new = False

            analysis.message_uuid = dto.message_uuid
            analysis.question_id = item.get("question_id", None)
            analysis.is_useless = False
            analysis.analyst_email = dto.analyst_email
            analysis.start_time = dto.start_time
            analysis.created_at = datetime.now()
            analysis.updated_at = datetime.now()
            analysis.submit_time = (
                dto.submit_time if dto.submit_time else datetime.now()
            )
            analysis.response = item.get("response", None)

            if is_new:
                db.add(analysis)

            db.commit()
            db.refresh(analysis)

            # Save choices
            single_choice = item.get("single_choice", None)
            if single_choice is not None:
                choices = [single_choice.get("value"), single_choice.get("sub_choice")]
                _save_choices(analysis=analysis, choices=choices, db=db)

            _save_choices(analysis=analysis, choices=item.get("choices", []), db=db)
    except IntegrityError as e:
        capture_exception(e)
        print(e)

    return get_analysis(survey_id=survey_id, db=db)
