"""migrate dynamo-db data to psql

Revision ID: 6a734a495274
Revises: ad21b6eb84ce
Create Date: 2024-01-22 20:03:07.879747

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = '6a734a495274'
down_revision = 'ad21b6eb84ce'
branch_labels = None
depends_on = None



def upgrade() -> None:
    import csv

    import boto3

    ORGANIZATIONS_TABLE = "organizations"
    PROGRAMS_TABLE = "programs"

    _dynamodb_client = boto3.client("dynamodb")  # specify amazon service to be used
    _dynamodb_resource = boto3.resource("dynamodb")

    # Copy organisations from dynamo db into psql
    organizations = _dynamodb_resource.Table(ORGANIZATIONS_TABLE).scan()["Items"]
    for row in organizations:
        op.execute(
            sa.text(
                "INSERT INTO organisations (name, parent_id) VALUES (:name, (SELECT id FROM organisations WHERE name = :parent LIMIT 1)) ON CONFLICT DO NOTHING"
            ).bindparams(name=row['organization'], parent=row.get('parent', None)),
        )
        # TODO: migrate org roles to the corresponding users


    # Copy programs from dynamo db into psql
    programs = _dynamodb_resource.Table(PROGRAMS_TABLE).scan()["Items"]
    for row in programs:
        # Skip programs which do not exists in programs table
        if row['program'] in ["MEDA", "UWR", "TUDRIDEP", "SF-9RDMSAAG", "CBCC", "CBCC-DEMO", "TEST-TS-NG", "CARE", 'LBG-F', 'LBG-FL']:
            continue

        # try:
        op.execute(
            sa.text(
                "INSERT INTO organisation_programs (organisation_id, program_id) VALUES ((SELECT id FROM organisations WHERE name = :org LIMIT 1), (SELECT id FROM programs WHERE program_id = :program LIMIT 1)) ON CONFLICT DO NOTHING"
            ).bindparams(org=row['organization'], program=row.get('program')),
        )
        # except Exception as e:
        #     print(e)
        #     continue

def downgrade() -> None:
    pass
