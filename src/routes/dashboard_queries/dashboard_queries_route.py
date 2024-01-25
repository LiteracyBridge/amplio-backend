from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models import get_db
from models.language_model import Language
from routes.dashboard_queries.tb_status import get_status
from schema import ApiResponse

router = APIRouter()


@router.get("/{program_id}/status")
def status(program_id: str, selector: str, db: Session = Depends(get_db)):
    return ApiResponse(
        data=get_status(
            programid=program_id,
            selector=selector if selector is not None else "bydepl",
        )
    )
