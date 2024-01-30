import json
from os import getenv
from typing import Any, Dict, Generic, List, Optional, Tuple, Type, TypeVar, Union

import sqlalchemy.types as types
from fastapi.encoders import jsonable_encoder
from psycopg2.extensions import AsIs
from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from config import config
from utils import snake_to_camel

engine = create_engine(config.db_url(), echo=config.db_echo)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base = declarative_base()

# The declarative base has to be shared between all models for the
# relationships between them to work
BaseModel = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class BaseSchema(PydanticBaseModel):
    "BaseSchema with map from camelCase to snake_case"

    class Config:
        from_attributes = True
        alias_generator = snake_to_camel
        populate_by_name = True


class Point(object):
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        return f"Point({self.x}, {self.y})"


class PGPoint(types.UserDefinedType):
    def get_col_spec(self, **kw):
        return "POINT"

    def bind_processor(self, dialect):
        def process(value):
            if value:
                return AsIs("POINT({0}, {1})".format(value.x, value.y))
            else:
                return None

        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value:
                x, y = value.lstrip("(").rstrip(")").split(",")
                return Point(float(x), float(y))
            else:
                return None

        return process


def query_to_json(
    query: str, name_map=None, params: Optional[Dict] = None
) -> List[Any]:
    db = next(get_db())

    with db.connection() as conn:
        db_result = conn.execute(text(query), params)
        columns = list(db_result.keys())
        if name_map:
            columns = [name_map.get(column, column) for column in columns]
        result = []
        for record in db_result:
            result.append(dict(zip(columns, record)))
    return result


# ModelType = TypeVar("ModelType", bound=BaseModel)
# CreateSchemaType = TypeVar("CreateSchemaType", bound=PydanticBaseModel)
# UpdateSchemaType = TypeVar("UpdateSchemaType", bound=PydanticBaseModel)


# def get_ordering_for_model(model, order=["id"]):
#     return [
#         getattr(model, field.replace(" desc", "")).desc()
#         if field.endswith(" desc")
#         else getattr(model, field)
#         for field in order
#     ]


# class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
#     def __init__(self, model: Type[ModelType]):
#         """
#         CRUD object with default methods to Create, Read, Update, Delete (CRUD).
#         **Parameters**
#         * `model`: A SQLAlchemy model class
#         * `schema`: A Pydantic model (schema) class
#         """
#         self.model = model

#     def get(self, db: Session, id: Any) -> Optional[ModelType]:
#         return db.query(self.model).filter(self.model.id == id).first()

#     def get_by_program_id(self, db: Session, program_id: str) -> Optional[ModelType]:
#         return (
#             db.query(self.model)
#             .filter(self.model.program_id == program_id)
#             .one_or_none()
#         )

#     def get_multi(
#         self,
#         db: Session,
#         *,
#         order: List[str] = ["id"],
#         skip: int = 0,
#         limit: int = 100,
#     ) -> List[ModelType]:
#         return (
#             db.query(self.model)
#             .order_by(*get_ordering_for_model(self.model, order))
#             .offset(skip)
#             .limit(limit)
#             .all()
#         )

#     def get_multi_by_program_id(
#         self,
#         db: Session,
#         *,
#         program_id: str,
#         order: List[str] = ["id"],
#         skip: int = 0,
#         limit: int = 100,
#     ) -> List[ModelType]:
#         return (
#             db.query(self.model)
#             .filter(self.model.program_id == program_id)
#             .order_by(*get_ordering_for_model(self.model, order))
#             .offset(skip)
#             .limit(limit)
#             .all()
#         )

#     def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
#         if isinstance(obj_in, dict):
#             create_data = obj_in
#         else:
#             create_data = obj_in.dict(exclude_unset=True)
#         db_obj = self.model(**create_data)  # type: ignore
#         db.add(db_obj)
#         db.commit()
#         db.refresh(db_obj)
#         return db_obj

#     def update(
#         self,
#         db: Session,
#         *,
#         db_obj: ModelType,
#         obj_in: Union[UpdateSchemaType, Dict[str, Any]],
#     ) -> ModelType:
#         obj_data = jsonable_encoder(db_obj)
#         if isinstance(obj_in, dict):
#             update_data = obj_in
#         else:
#             update_data = obj_in.dict(exclude_unset=True)
#         for field in obj_data:
#             if field in update_data:
#                 setattr(db_obj, field, update_data[field])
#         db.add(db_obj)
#         db.commit()
#         db.refresh(db_obj)
#         return db_obj

#     def remove(self, db: Session, *, id: int) -> Union[ModelType, None]:
#         obj = db.query(self.model).get(id)

#         if obj is not None:
#             db.delete(obj)
#             db.commit()

#         return obj

#     def remove_by_id_and_code(
#         self, db: Session, *, id: int, program_id: str
#     ) -> Dict[str, str]:
#         obj = (
#             db.query(self.model)
#             .filter(
#                 self.model.id == id,
#                 self.model.program_id == program_id,
#             )
#             .one()
#         )
#         db.delete(obj)
#         db.commit()

#         return {"message": "Successfully delete"}
