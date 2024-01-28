from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, subqueryload

from models import Choice, Project, Question, Survey, SurveySection, get_db
from schema import ApiResponse

router = APIRouter()


class SurveyDto(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    language: str = "en"
    deployment_id: int
    project_code: str
    status: str = "draft"


@router.get("/{project_code}")
def get_all_surveys(project_code: str, db: Session = Depends(get_db)):
    return ApiResponse(
        data=db.query(Survey)
        .filter(Survey.project_code == project_code)
        .options(
            subqueryload(Survey.deployment),
            subqueryload(Survey.sections),
            subqueryload(Survey.questions).options(
                subqueryload(Question.choices).options(subqueryload(Choice.sub_options))
            ),
        )
        .all()
    )


def _find_survey_by_id(survey_id: int, db: Session):
    survey = (
        db.query(Survey)
        .filter(Survey.id == survey_id)
        .options(
            subqueryload(Survey.deployment),
            subqueryload(Survey.sections),
            subqueryload(Survey.questions).options(
                subqueryload(Question.choices).options(subqueryload(Choice.sub_options))
            ),
        )
        .first()
    )

    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")

    return survey


@router.put("/{survey_id}/status")
def change_status(
    survey_id: int, status: Annotated[str, Body], db: Session = Depends(get_db)
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")

    survey.status = status
    db.commit()

    return ApiResponse(data=[_find_survey_by_id(survey.id, db)])


@router.post("")
def create_or_update(dto: SurveyDto, db: Session = Depends(get_db)):
    new_survey: Survey = Survey()
    is_new: bool = True

    if dto.id is not None:
        new_survey = db.query(Survey).filter(Survey.id == dto.id).first()
        is_new = False

        if new_survey is None:
            raise HTTPException(status_code=404, detail="Survey not found")

    new_survey.name = dto.name
    new_survey.description = dto.description
    new_survey.language = dto.language
    new_survey.deployment_id = dto.deployment_id
    new_survey.project_code = dto.project_code
    new_survey.status = dto.status

    if new_survey.id is None:
        db.add(new_survey)

    db.commit()

    # Create default section
    if is_new:
        section = SurveySection()
        section.name = "Default Section"
        section.survey_id = new_survey.id
        db.add(section)
        db.commit()

    return ApiResponse(data=[_find_survey_by_id(new_survey.id, db)])


class QuestionsDto(BaseModel):
    sections: List[Dict[str, Any]] = []
    questions: List[Dict[str, Any]] = []


def _create_or_update_choices(
    question: Question,
    dto: List[Dict[str, Any]],
    db: Session,
    parent_choice_id: Optional[int] = None,
):
    """Save or update options for a question

    Args:
        question (Question): _description_
        dto (List[Dict[str, Any]]): _description_
        db (Session): _description_

    Returns:
        _type_: _description_
    """

    for index, option in enumerate(dto):
        option_id = str(option.get("choice_id", None))
        if option.get("is_deleted", False) and option_id.isdigit():
            db.query(Choice).filter(Choice.choice_id == option_id).delete()
            continue

        choice = Choice()
        if option_id is not None and option_id.isdigit():
            resp = db.query(Choice).filter(Choice.choice_id == option_id).first()
            choice = Choice() if resp is None else resp

        choice.value = option.get("value", "")
        choice.is_other = option.get("is_other", False)
        choice.question_id = question.id
        choice.parent_id = parent_choice_id

        # TODO: make the follution nullable
        choice.choice_list = choice.value
        choice.choice_label = choice.value

        order = option.get("order")
        if order is not None:
            choice.order = order
        else:
            choice.order = index + 1

        if option.get("is_new", False):
            db.add(choice)

        db.commit()
        db.refresh(choice)

        sub_options = option.get("sub_options", [])
        if len(sub_options) > 0:
            _create_or_update_choices(
                question=question,
                dto=sub_options,
                db=db,
                parent_choice_id=choice.choice_id,
            )

    return question


def _create_question(survey_id: int, dto: Dict[str, Any], db: Session):
    question = Question()

    id = dto.get("id", None)
    if id is not None and str(id).isdigit():
        question = db.query(Question).filter(Question.id == id).first()
        question = Question() if question is None else question

    question.question_label = dto.get("question_label", "Untitled Question")
    question.survey_id = survey_id
    question.type = dto.get("type", "text")
    question.order = dto.get("order", 0)
    question.required = dto.get("required", True)
    question.parent_id = dto.get("parent_id", None)
    question.conditions = dto.get("conditions", None)
    question.section_id = dto.get("section_id", None)

    # TODO: make name option
    # question.name = question.question_label
    # question.data = question.question_label

    if dto.get("is_new", False):
        db.add(question)

    db.commit()

    # Save options
    _create_or_update_choices(
        question=question,
        dto=dto.get("choices", []),
        db=db,
        parent_choice_id=None,
    )

    return question


def _create_section(survey_id: int, dto: Dict[str, Any], db: Session):
    id = dto.get("id", None)
    section = SurveySection()

    if id is not None and str(id).isdigit():
        section = db.query(SurveySection).filter(SurveySection.id == id).first()
        section = SurveySection() if section is None else section

    section.survey_id = survey_id
    section.name = dto.get("name", "Untitled Section")

    if dto.get("is_new", False):
        db.add(section)

    db.commit()

    print(section.id)

    return section


@router.post("/{survey_id}/questions")
def save_or_create_question(
    survey_id: int, dto: QuestionsDto, db: Session = Depends(get_db)
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")

    # Create/update sections
    for index, section_dto in enumerate(dto.sections):
        if (
            section_dto.get("is_deleted", False)
            and str(section_dto.get("id", None)).isdigit()
        ):
            _pos = dto.sections.index(section_dto)
            dto.sections.pop(_pos)
            db.query(SurveySection).filter(
                SurveySection.id == section_dto["id"]
            ).delete()
            continue

        # section = SurveySection()
        # section.survey_id = survey_id
        # section.name = section_dto.get("name", "Untitled Section")

        # if section_dto.get("is_new", False):
        #     db.add(section)

        # db.commit()
        # db.refresh(section)

        section_dto["new_id"] = _create_section(
            survey_id=survey_id, dto=section_dto, db=db
        ).id
        dto.sections[index] = section_dto

    # Create/update questions
    for index, question_dto in enumerate(dto.questions):
        if (
            question_dto.get("is_deleted", False)
            and str(question_dto.get("id", None)).isdigit()
        ):
            db.query(Question).filter(Question.id == question_dto["id"]).delete()

            # Remove deleted question from submitted questions, so we don't try to save it
            _pos = dto.questions.index(question_dto)
            dto.questions.pop(_pos)
            continue

        question = Question()
        question.survey_id = survey_id
        question.type = question_dto.get("type", "text")
        question.question_label = question_dto.get(
            "question_label", "Untitled Question"
        )
        # question.data = question_dto.get("data", "{}")
        # question.data_other = question_dto.get("data_other", None)
        question.order = question_dto.get("order", 0)
        # question.parent_id = question_dto.get("parent_id", None)
        question.conditions = question_dto.get("conditions", {})

        # TODO: get parent id from dto.questions
        parent_id = question_dto.get("parent_id", None)
        if parent_id is not None:
            parent = db.query(Question).filter(Question.id == parent_id).first()
            if parent is not None:
                question_dto["parent_id"] = parent.id
            elif isinstance(parent_id, str):
                # We assume the id was generated by the frontend (uuid)
                parent = next(
                    (item for item in dto.questions if item["id"] == parent_id), None
                )

                if parent is not None:
                    question_dto["parent_id"] = _create_question(
                        survey_id, parent, db
                    ).id
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Parent question of question {question_dto['id']} cannot be found!",
                    )

        # TODO: get section from dto.sections
        section_id = question_dto.get("section_id", None)
        if section_id is not None:
            result = next(
                (
                    item
                    for item in dto.sections
                    if item["id"] == section_id
                    or item.get("new_id", item["id"]) == section_id
                ),
                None,
            )

            if result is None:
                continue

            query_id = (
                result.get("new_id")
                if str(result.get("new_id")).isdigit()
                else result.get("id")
            )
            section = (
                db.query(SurveySection).filter(SurveySection.id.in_([query_id])).first()
            )
            if section is not None:
                question_dto["section_id"] = section.id

        db.commit()
        # else:
        #     raise HTTPException(
        #         status_code=400,
        #         detail=f"Section id for question {question['id']} cannot be found!",
        #     )

        dto.questions[index] = _create_question(survey_id, question_dto, db)

        # TODO: save options

    return ApiResponse(data=[_find_survey_by_id(survey_id, db)])
