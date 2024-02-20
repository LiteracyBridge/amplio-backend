"""migrate-dynamo-user-programs

Revision ID: ae044f514175
Revises: 72eae51faaba
Create Date: 2024-02-20 12:35:06.006084

"""

from datetime import datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "ae044f514175"
down_revision = "72eae51faaba"
branch_labels = None
depends_on = None


def upgrade() -> None:
    import boto3

    _dynamodb_client = boto3.client("dynamodb")  # specify amazon service to be used
    _dynamodb_resource = boto3.resource("dynamodb")

    # Copy organisations from dynamo db into psql
    organizations = _dynamodb_resource.Table("programs").scan()["Items"]
    for row in organizations:
        program_id = row["program"]
        # Create staffs
        staffs = row.get("roles", {})

        for email, S in staffs.items():
            user = (
                op.get_bind()
                .execute(
                    sa.text(
                        "SELECT id FROM users WHERE email=:email LIMIT 1"
                    ).bindparams(email=email)
                )
                .fetchall()
            )
            if len(user) == 0:
                continue

            program = (
                op.get_bind()
                .execute(
                    sa.text(
                        "SELECT id FROM programs WHERE program_id=:program_id LIMIT 1"
                    ).bindparams(program_id=program_id)
                )
                .fetchall()
            )

            if len(program) == 0:
                continue

            staffId = (
                op.get_bind()
                .execute(
                    sa.text(
                        "INSERT INTO program_users (user_id, program_id, created_at, updated_at) VALUES (:user_id, :program_id, :date, :date) ON CONFLICT DO NOTHING RETURNING (user_id, program_id)"
                    ).bindparams(
                        user_id=user[0][0],
                        program_id=program[0][0],
                        date=datetime.now(),
                    ),
                )
                .fetchall()
            )

            print(staffId)


def downgrade() -> None:
    pass
