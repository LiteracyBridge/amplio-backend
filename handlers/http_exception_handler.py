import logging

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sentry_sdk import capture_exception

logger = logging.getLogger()

async def http_exception_handler (request: Request, exc: HTTPException):
    print(exc)

    logger.exception(exc, extra={'uuid':request.state.correlation_id, 'type':'api-error'})
    return JSONResponse(
        status_code=exc.status_code,
        content={"uuid": request.state.correlation_id, "message": exc.detail}
        )
