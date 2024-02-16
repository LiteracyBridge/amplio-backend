"""Creates default roles for all organisations

Administrator, Program Officer, Content Officer and Field Officers are the default roles created for all organisations.

Revision ID: a21c9d376902
Revises: d80d86bc8059
Create Date: 2024-02-16 15:53:56.049553

"""

from datetime import date, datetime
from json import dumps

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "a21c9d376902"
down_revision = "d80d86bc8059"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ! NB: All roles have the same permissions, this will be changed later
    PERMISSIONS = {
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

    names = ["Administrator", "Program Manager", "Content Officer", "Field Officer"]
    organisations = (
        op.get_bind().execute(sa.text("SELECT id FROM organisations")).fetchall()
    )
    for org in organisations:
        for name in names:
            op.execute(
                sa.text(
                    "INSERT INTO roles (name, description, organisation_id, permissions, created_at, updated_at) VALUES (:name, :desc, :org, :permissions, :date, :date)"
                ).bindparams(
                    date=datetime.now(),
                    desc=f"{name} role",
                    name=name,
                    org=org[0],
                    permissions=dumps(PERMISSIONS),
                )
            )


def downgrade() -> None:
    pass
