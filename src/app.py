import re
import uuid

import sentry_sdk
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
from sqlalchemy.orm import subqueryload

from config import config
from handlers.exception_handler import exception_handler
from handlers.http_exception_handler import http_exception_handler
from jwt_verifier import USER_CACHE, VERIFIED_JWT_CLAIMS_CACHE, CognitoAuthenticator
from middlewares.correlation_id_middleware import CorrelationIdMiddleware
from middlewares.logging_middleware import LoggingMiddleware
from models import get_db
from models.user_model import User, UserRole
from monitoring import logging_config
from routes import (
    acm_checkout_route,
    categories_route,
    language_route,
    program_route,
    tableau_route,
    talking_book_loader_route,
    user_feedback,
)
from routes.dashboard_queries import dashboard_queries_route
from routes.program_spec import program_spec_route
from routes.users import roles_route, users_route
from utilities.permissions import Permission, has_permission

if config.sentry_dsn is not None:
    sentry_sdk.init(
        dsn=config.sentry_dsn,
        environment=config.sentry_environment,
        integrations=[
            AwsLambdaIntegration(timeout_warning=True),
        ],
    )


app = FastAPI()

origins = [
    "http://localhost:8080",
    "http://localhost:4173",
    "https://suite.amplio.org",
    "https://suite-test.amplio.org",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cognito_auth = CognitoAuthenticator()


@app.middleware("http")
async def verify_jwt(request: Request, call_next):
    """
    Middleware function to verify the JWT access token in the request headers.

    Args:
        request (Request): The incoming request object.
        call_next (Callable): The next middleware or route handler.

    Raises:
        401 HTTPException: If no access token is provided in the request headers or
            if the access token is invalid.

    Returns:
        Response: The response object.
    """

    if request.method == "OPTIONS":
        return await call_next(request)

    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="No access token provided")

    token = token.replace("Bearer ", "").replace("Authorization: ", "")
    cognito_auth.verify_token(token)
    email = str(VERIFIED_JWT_CLAIMS_CACHE.get(token, {}).get("email"))

    # Query current user from db and attach to request state
    if USER_CACHE.get(email, None) is not None and isinstance(
        USER_CACHE.get(email), User
    ):
        # If the user is already in the cache, skip the db query
        request.state.current_user = USER_CACHE[email]
    else:
        user = (
            next(get_db())
            .query(User)
            .filter(User.email == email)
            .options(subqueryload(User.roles).options(subqueryload(UserRole.role)))
            .first()
        )

        # TODO: check if user is accepting invitation, path  -> /me
        # If the user is accepting an invitation, skip permission loading and pass through request
        if user is None and "/users/me" in request.url.path:
            request.state.current_user = None
            return await call_next(request)

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized",
            )

        user.load_permissions()
        USER_CACHE[email] = user
        request.state.current_user = user

    response = await call_next(request)

    return response


if not config.is_local:
    ###############################################################################
    #   Logging configuration                                                     #
    ###############################################################################
    logging_config.configure_logging(
        level="DEBUG", service="SUITE", instance=str(uuid.uuid4())
    )

    ###############################################################################
    #   Error handlers configuration                                              #
    ###############################################################################
    app.add_exception_handler(Exception, exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)  # type: ignore

    ###############################################################################
    #   Middlewares configuration                                                 #
    ###############################################################################

    # Tip : middleware order : CorrelationIdMiddleware > LoggingMiddleware -> reverse order
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(CorrelationIdMiddleware)


###############################################################################
#   Routers configuration                                                     #
###############################################################################
app.include_router(
    program_spec_route.router,
    prefix="/program-spec",
    tags=["program-spec"],
    dependencies=[
        Depends(get_db),
        Depends(has_permission(Permission.manage_specification)),
    ],
)
app.include_router(
    program_route.router,
    prefix="/programs",
    tags=["programs"],
    dependencies=[Depends(get_db)],
)
app.include_router(
    categories_route.router,
    prefix="/categories",
    tags=["categories"],
    dependencies=[Depends(get_db)],
)
app.include_router(
    users_route.router,
    prefix="/users",
    tags=["user"],
    dependencies=[Depends(get_db)],
)
app.include_router(
    roles_route.router,
    prefix="/users/roles",
    tags=["user-roles"],
    dependencies=[Depends(get_db), Depends(has_permission(Permission.manage_role))],
)
app.include_router(
    language_route.router,
    prefix="/languages",
    tags=["languages"],
    dependencies=[Depends(get_db)],
)
app.include_router(
    tableau_route.router,
    prefix="/tableau",
    tags=["tableau"],
    dependencies=[
        Depends(get_db),
        Depends(has_permission(Permission.view_tb_analytics)),
    ],
)
app.include_router(
    dashboard_queries_route.router,
    prefix="/dashboard-queries",
    tags=["dashboard-queries"],
    dependencies=[Depends(get_db)],
)
app.include_router(
    user_feedback.uf_routes,
    prefix="/user-feedback",
    tags=["user-feedback"],
    dependencies=[Depends(get_db)],
)
app.include_router(
    talking_book_loader_route.router,
    prefix="/tb-loader",
    tags=["talking-book-loader"],
    dependencies=[Depends(get_db)],
)
app.include_router(
    acm_checkout_route.router,
    prefix="/acm-checkout",
    tags=["acm-checkout"],
    dependencies=[
        Depends(get_db),
        Depends(has_permission(Permission.manage_checkout)),
    ],
)

# app.include_router(
#     analysis_route.router,
#     prefix="/analysis",
#     tags=["analysis"],
#     dependencies=[Depends(models.get_db)],
# )
# app.include_router(
#     data_service_route.router,
#     prefix="/data-service",
#     tags=["data-service"],
#     dependencies=[Depends(models.get_db)],
# )
# app.include_router(
#     uf_messages_route.router,
#     prefix="/messages",
#     tags=["messages"],
#     dependencies=[Depends(models.get_db)],
# )


###############################################################################
#   Handler for AWS Lambda                                                    #
###############################################################################

handler = Mangum(app)

###############################################################################
#   Run the self contained application                                        #
###############################################################################

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
