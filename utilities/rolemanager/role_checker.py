from functools import wraps
from typing import Union
from fastapi import Request, HTTPException
from jwt_verifier import VERIFIED_JWT_CLAIMS_CACHE
from utilities.rolemanager import manager

ALLOWED_ROLES: str = "AD,PM,CO,FO"


async def current_user(request: Request) -> Union[str, None]:
    return VERIFIED_JWT_CLAIMS_CACHE[request.headers.get("Authorization")].get("email")


def user_has_allowed_role(func):
    def _determine_program_id(path_params, query_params) -> Union[str, None]:
        for x in [
            n
            for n in ["programid", "program_id", "programId", "project"]
            if n in path_params
        ]:
            return path_params[x]
        for x in [
            n
            for n in ["programid", "program_id", "programId", "project"]
            if n in query_params
        ]:
            return query_params[x]

    @wraps(func)
    async def wrapper(*args, **kwargs):
        # access request object
        request: Request = kwargs.get("request")
        allowed_roles: str = kwargs.get("allowed_roles", ALLOWED_ROLES)

        if request is None:
            raise ValueError(
                "'request' object is required! Please add it as first argument of the route function."
            )

        if allowed_roles is not None:
            email = VERIFIED_JWT_CLAIMS_CACHE[request.headers.get("Authorization")].get(
                "email"
            )

            programid = _determine_program_id(request.path_params, request.query_params)
            allowed = manager.user_has_role_in_program(
                email=email, program=programid, roles=allowed_roles
            )
            if not allowed:
                raise HTTPException(
                    status_code=403,
                    detail="This user does not have an appropriate role in the program",
                )

    return wrapper


# @app.post("/")
# @auth_required # Custom decorator
