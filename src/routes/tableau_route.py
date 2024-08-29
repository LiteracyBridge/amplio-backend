import datetime
import uuid

from fastapi import APIRouter, Depends
from jose import jwt

from config import config
from models.user_model import User, current_user
from schema import ApiResponse

router = APIRouter()


@router.get("/jwt")
def get_jwt():
    claims = {
        "iss": config.tableau_client_id,
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=5),
        "jti": str(uuid.uuid4()),
        "aud": "tableau",
        "sub": "tableau1@amplio.org",
        "scp": ["tableau:views:embed", "tableau:metrics:embed"],
    }

    headers = {"kid": config.tableau_secret_id, "iss": config.tableau_client_id}
    # Tableau is unclear on this; the example mentions "key", which is undoc'd
    algorithm = "HS256"
    token = jwt.encode(
        claims, str(config.tableau_secret_value), algorithm, headers=headers
    )

    return ApiResponse(data=[token])
