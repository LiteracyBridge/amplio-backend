from enum import Enum
from typing import List

from fastapi import HTTPException, Request

# TODO: Document this
ROLES_LIST = {
    "acm": [
        "manage_deployment",
        "manage_playlist",
        "manage_prompt",
        "manage_content",
        "manage_checkout",
    ],
    "talking_book_loader": [
        "deploy_content",
    ],
    "user_feedback": ["manage_survey", "analyse_survey", "review_analysis"],
    "staff": ["manage_staff", "manage_role"],
    "program": [
        "manage_users",
        "manage_specification",
        "manage_program",
    ],
    "statistics": ["view_tb_analytics", "view_deployment_status"],
}


class Permission(Enum):
    # ACM/TB Loader
    manage_deployment = ROLES_LIST["acm"][0]
    manage_playlist = ROLES_LIST["acm"][1]
    manage_prompt = ROLES_LIST["acm"][2]
    manage_content = ROLES_LIST["acm"][3]
    manage_checkout = ROLES_LIST["acm"][4]

    # Talking Book Loader
    deploy_content = ROLES_LIST["talking_book_loader"][0]

    # User feedback
    manage_survey = ROLES_LIST["user_feedback"][0]
    analyse_survey = ROLES_LIST["user_feedback"][1]
    review_analysis = ROLES_LIST["user_feedback"][2]

    # Staff
    manage_staff = ROLES_LIST["staff"][0]
    manage_role = ROLES_LIST["staff"][1]

    # Programs
    manage_users = ROLES_LIST["program"][0]
    manage_specification = ROLES_LIST["program"][1]
    manage_program = ROLES_LIST["program"][2]

    # Statistics
    view_tb_analytics = ROLES_LIST["statistics"][0]
    view_deployment_status = ROLES_LIST["statistics"][1]


def has_permission(action: Permission | List[Permission]):
    """
    Verifies that the user has the specified permission.
    If action is a list, then the user must have at least one permission
    in the list.

    Throws forbiden exception is the user doesn't have enough permissions.
    """

    def _can(request: Request) -> bool:
        permissions = request.state.current_user.permissions
        has = False

        if isinstance(action, list):
            has = any(permissions.get(a.value, False) == True for a in action)
        else:
            has = permissions.get(action.value, False) == True

        if not has:
            raise HTTPException(
                status_code=403, detail="Not enough permission to perform this action"
            )

        return has

    return _can
