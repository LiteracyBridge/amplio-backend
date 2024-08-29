from fastapi import APIRouter, Depends

from database import get_db
from routes.user_feedback import (
    analysis_route,
    report_route,
    survey_route,
    uf_messages_route,
)
from utilities.permissions import Permission, has_permission

uf_routes = APIRouter()

uf_routes.include_router(
    survey_route.router,
    prefix="/surveys",
    tags=["surveys"],
    dependencies=[Depends(get_db), Depends(has_permission(Permission.analyse_survey))],
)
uf_routes.include_router(
    analysis_route.router,
    prefix="/analysis",
    tags=["analysis"],
    dependencies=[
        Depends(get_db),
        Depends(
            has_permission([Permission.review_analysis, Permission.analyse_survey])
        ),
    ],
)
# uf_routes.include_router(
#     data_service_route.router,
#     prefix="/data-service",
#     tags=["data-service"],
#     dependencies=[Depends(get_db)],
# )
uf_routes.include_router(
    uf_messages_route.router,
    prefix="/messages",
    tags=["messages"],
    dependencies=[
        Depends(get_db),
        Depends(
            has_permission([Permission.review_analysis, Permission.analyse_survey])
        ),
    ],
)
uf_routes.include_router(
    report_route.router,
    prefix="/reports",
    tags=["reports"],
    dependencies=[
        Depends(get_db),
        Depends(
            has_permission([Permission.review_analysis, Permission.analyse_survey])
        ),
    ],
)
