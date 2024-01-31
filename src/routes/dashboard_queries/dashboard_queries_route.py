from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, subqueryload

from database import query_to_json
from models import get_db
from models.recipient_model import Recipient
from models.tb_deployed_model import TalkingBookDeployed
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


@router.get("/{program_id}/recipients")
def recipients(program_id: str, db: Session = Depends(get_db)):
    # TODO: populate tbdeployed
    return ApiResponse(
        data=db.query(Recipient)
        .filter(Recipient.program_id == program_id)
        .options(
            subqueryload(Recipient.talkingbooks_deployed).options(
                subqueryload(TalkingBookDeployed.deployment),
            ),
        )
        .all()
    )
