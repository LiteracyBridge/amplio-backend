from enum import Enum
from typing import List

from fastapi import HTTPException, Request

# TODO: Document this

# Template of permissions for each module. This is used to build the roles UI on the frontend.
# The key is the module name and the value is a list of permissions for that module.
#
#! NOTE: Permission enum is used to access the permissions in a type-safe way.
#! The enum values are the same as the permissions in the template.
PERMISSIONS_TEMPLATE = {
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
    """
    Permission enum is used to access the PERMISSIONS_TEMPLATE in a type-safe way.
    ! NOTE: This and the PERMISSIONS_TEMPLATE should be kept in sync.
    """

    # ACM/TB Loader
    manage_deployment = PERMISSIONS_TEMPLATE["acm"][0]
    manage_playlist = PERMISSIONS_TEMPLATE["acm"][1]
    manage_prompt = PERMISSIONS_TEMPLATE["acm"][2]
    manage_content = PERMISSIONS_TEMPLATE["acm"][3]
    manage_checkout = PERMISSIONS_TEMPLATE["acm"][4]

    # Talking Book Loader
    deploy_content = PERMISSIONS_TEMPLATE["talking_book_loader"][0]

    # User feedback
    manage_survey = PERMISSIONS_TEMPLATE["user_feedback"][0]
    analyse_survey = PERMISSIONS_TEMPLATE["user_feedback"][1]
    review_analysis = PERMISSIONS_TEMPLATE["user_feedback"][2]

    # Staff
    manage_staff = PERMISSIONS_TEMPLATE["staff"][0]
    manage_role = PERMISSIONS_TEMPLATE["staff"][1]

    # Programs
    manage_users = PERMISSIONS_TEMPLATE["program"][0]
    manage_specification = PERMISSIONS_TEMPLATE["program"][1]
    manage_program = PERMISSIONS_TEMPLATE["program"][2]

    # Statistics
    view_tb_analytics = PERMISSIONS_TEMPLATE["statistics"][0]
    view_deployment_status = PERMISSIONS_TEMPLATE["statistics"][1]


def has_permission(action: Permission | List[Permission]):
    """
    Verifies that the user has the specified permission.
    If action is a list, then the user must have at least one permission
    in the list.

    Throws forbidden exception is the user doesn't have enough permissions.
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
