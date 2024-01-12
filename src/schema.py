from typing import Any, List, TypeVar
from pydantic import BaseModel


T = TypeVar("T")


class ApiResponse():
    data: List[Any]
    status_code: int = 200
    status: str = "OK"


    def __init__(self, data: List[Any], status_code: int = 200, status: str = "OK"):
        self.data = data
        self.status_code = status_code
        self.status = status

    # class Config:
    #     orm_mode = True
