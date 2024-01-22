"""migrate dynamo-db data to psql

Revision ID: e8a26ed86742
Revises: 3200593300fe
Create Date: 2024-01-22 18:30:23.392011

"""
import os

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "e8a26ed86742"
down_revision = "3200593300fe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    import csv

    import boto3

    ORGANIZATIONS_TABLE = "organizations"
    PROGRAMS_TABLE = "programs"

    _dynamodb_client = boto3.client("dynamodb")  # specify amazon service to be used
    _dynamodb_resource = boto3.resource("dynamodb")

    # Fetch organisations from dynamo db
    organizations = _dynamodb_resource.Table(ORGANIZATIONS_TABLE).scan()["Items"]
    for row in organizations:
        op.execute(
            sa.text(
                "INSERT INTO organisations (name, parent_id) VALUES (:name, (SELECT id FROM organisations WHERE name = :parent LIMIT 1)) ON CONFLICT DO NOTHING"
            ).bindparams(name=row['organization'], parent=row.get('parent', None)),
        )
        # TODO: migrate org roles to the corresponding users


def downgrade() -> None:
    pass
