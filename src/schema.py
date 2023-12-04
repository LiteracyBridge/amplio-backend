from dataclasses import dataclass
from typing import Any, Generic, List, TypeVar
from pydantic import BaseModel


T = TypeVar("T")


class ApiResponse(BaseModel):
    data: List[Any]

    class Config:
        orm_mode = True
