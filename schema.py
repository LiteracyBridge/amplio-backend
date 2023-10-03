from dataclasses import dataclass
from typing import Generic, List, TypeVar
from pydantic import BaseModel


T = TypeVar("T")


class ApiResponse(BaseModel):
    data: List[T]

    class Config:
        orm_mode = True
