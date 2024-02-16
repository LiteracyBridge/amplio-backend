from enum import Enum

# TODO: Document this
ROLES_TEMPLATE = {
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
    manage_deployment = ROLES_TEMPLATE["acm"][0]
    manage_playlist = ROLES_TEMPLATE["acm"][1]
    manage_prompt = ROLES_TEMPLATE["acm"][2]
    manage_content = ROLES_TEMPLATE["acm"][3]
    manage_checkout = ROLES_TEMPLATE["acm"][4]

    # Talking Book Loader
    deploy_content = ROLES_TEMPLATE["talking_book_loader"][0]

    # User feedback
    manage_survey = ROLES_TEMPLATE["user_feedback"][0]
    analyse_survey = ROLES_TEMPLATE["user_feedback"][1]
    review_analysis = ROLES_TEMPLATE["user_feedback"][2]

    # Staff
    manage_staff = ROLES_TEMPLATE["staff"][0]
    manage_role = ROLES_TEMPLATE["staff"][1]

    # Programs
    manage_users = ROLES_TEMPLATE["program"][0]
    manage_specification = ROLES_TEMPLATE["program"][1]
    manage_program = ROLES_TEMPLATE["program"][2]

    # Statistics
    view_tb_analytics = ROLES_TEMPLATE["statistics"][0]
    view_deployment_status = ROLES_TEMPLATE["statistics"][1]
