from typing import Any, List, TypeVar
from pydantic import BaseModel


T = TypeVar("T")


class ApiResponse(BaseModel):
    data: List[Any]
    status_code: int = 200
    status: str = "OK"

    class Config:
        from_attributes = True
