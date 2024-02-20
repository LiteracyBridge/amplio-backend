"""migrate-staffs-from-dynamo

Revision ID: 7938a33c95bb
Revises: a21c9d376902
Create Date: 2024-02-16 16:42:56.776396

"""

from datetime import datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "7938a33c95bb"
down_revision = "a21c9d376902"
branch_labels = None
depends_on = None


def upgrade() -> None:
    import boto3

    role_names_map = {
        # "*": "Administrator",
        "AD": "Administrator",
        "PM": "Program Manager",
        "CO": "Content Officer",
        "FO": "Field Officer",
    }

    _dynamodb_client = boto3.client("dynamodb")  # specify amazon service to be used
    _dynamodb_resource = boto3.resource("dynamodb")

    # Copy organisations from dynamo db into psql
    organizations = _dynamodb_resource.Table("organizations").scan()["Items"]
    for row in organizations:
        org_name = row["organization"]
        # Create staffs
        staffs = row.get("roles", {})

        for email, S in staffs.items():
            staffId = (
                op.get_bind()
                .execute(
                    sa.text(
                        "INSERT INTO users (email, first_name, last_name, organisation_id, created_at, updated_at) VALUES (:email, :first_name, :last_name, (SELECT id FROM organisations WHERE name = :org LIMIT 1), :date, :date) ON CONFLICT DO NOTHING RETURNING id"
                    ).bindparams(
                        email=email,
                        first_name=email.split("@")[0],
                        last_name="",
                        org=org_name,
                        date=datetime.now(),
                    ),
                )
                .fetchall()
            )

            roles = S.split(",")
            for role_key in roles:
                if role_key == "*":
                    continue

                name = role_names_map[role_key]

                op.execute(
                    sa.text(
                        "INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES (:user_id, (SELECT id FROM roles WHERE name = :name AND organisation_id = (SELECT id FROM organisations WHERE name = :org LIMIT 1) LIMIT 1), :date, :date) ON CONFLICT DO NOTHING"
                    ).bindparams(
                        user_id=staffId[0][0],
                        name=name,
                        org=org_name,
                        date=datetime.now(),
                    ),
                )


def downgrade() -> None:
    pass
