import logging

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sentry_sdk import capture_exception

logger = logging.getLogger()

async def exception_handler (request: Request, exc: Exception):
    logger.exception(exc, extra={'uuid':request.state.correlation_id, 'type':'app-error'})

    print(exc)
    return JSONResponse(
        status_code=500,
        content={"uuid": request.state.correlation_id, "message": "An internal error has occurred"}
        )
