import uuid
import uvicorn
import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
from fastapi import Depends, FastAPI, HTTPException, Request
from mangum import Mangum

from monitoring import logging_config
from middlewares.correlation_id_middleware import CorrelationIdMiddleware
from middlewares.logging_middleware import LoggingMiddleware
from handlers.exception_handler import exception_handler
from handlers.http_exception_handler import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from jwt_verifier import CognitoAuthenticator
import models
from config import config

from routes.program_spec import program_spec_route
from routes import program_route

# from routes import survey_route, data_service_route, analysis_route, uf_messages_route

if config.sentry_dsn is not None:
    sentry_sdk.init(
        dsn=config.sentry_dsn,
        integrations=[
            AwsLambdaIntegration(timeout_warning=True),
        ],
        #     # Set traces_sample_rate to 1.0 to capture 100%
        #     # of transactions for performance monitoring.
        #     # We recommend adjusting this value in production,
        #     # traces_sample_rate=1.0,
    )


# from database import SessionLocal, engine

# models.Base.metadata.create_all(bind=engine)

# FIXME: add congnito JWT verify middleware

app = FastAPI()

origins = [
    "http://localhost:8080",
    "suite.amplio.org",
    "https://suite.amplio.org",
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
    # return await call_next(request)

    # Get the access token from the request headers
    if request.method == "OPTIONS":
        return await call_next(request)

    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="No access token provided")

    cognito_auth.verify_token(token.replace("Bearer ", ""))

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
    app.add_exception_handler(HTTPException, http_exception_handler)

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
    dependencies=[Depends(models.get_db)],
)
app.include_router(
    program_route.router,
    prefix="/programs",
    tags=["programs"],
    dependencies=[Depends(models.get_db)],
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
