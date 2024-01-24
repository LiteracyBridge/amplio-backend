from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models import get_db
from models.language_model import Language
from schema import ApiResponse

router = APIRouter()


@router.get("/supported")
def get_multi(db: Session = Depends(get_db)):
    """Returns a list of languages that can be used in the project"""

    return ApiResponse(data=db.query(Language).all())
