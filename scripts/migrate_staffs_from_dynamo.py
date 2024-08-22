"""Migration script to copy staffs from dynamo db into psql
"""

from datetime import datetime

import boto3
import sqlalchemy as sa

from database import get_db

role_names_map = {
    "*": "Administrator",
    "AD": "Administrator",
    "PM": "Program Manager",
    "CO": "Content Officer",
    "FO": "Field Officer",
}


def run():
    _dynamodb_client = boto3.client("dynamodb")  # specify amazon service to be used
    _dynamodb_resource = boto3.resource("dynamodb")
    db = next(get_db())

    # Copy organisations from dynamo db into psql
    organizations = _dynamodb_resource.Table("organizations").scan()["Items"]
    for row in organizations:
        org_name = row["organization"]
        # Create staffs
        staffs = row.get("roles", {})

        for email, S in staffs.items():
            staffId = db.execute(
                sa.text(
                    "INSERT INTO users (email, first_name, last_name, organisation_id, created_at, updated_at) VALUES (:email, :first_name, :last_name, (SELECT id FROM organisations WHERE name = :org LIMIT 1), :date, :date) ON CONFLICT DO NOTHING RETURNING id"
                ).bindparams(
                    email=email,
                    first_name=email.split("@")[0],
                    last_name="",
                    org=org_name,
                    date=datetime.now(),
                ),
            ).fetchall()

            roles = S.split(",")
            for role_key in roles:
                # if role_key == "*":
                #     continue

                name = role_names_map[role_key]
                if len(staffId) == 0:
                    continue

                db.execute(
                    sa.text(
                        "INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES (:user_id, (SELECT id FROM roles WHERE name = :name AND organisation_id = (SELECT id FROM organisations WHERE name = :org LIMIT 1) LIMIT 1), :date, :date) ON CONFLICT DO NOTHING"
                    ).bindparams(
                        user_id=staffId[0][0],
                        name=name,
                        org=org_name,
                        date=datetime.now(),
                    ),
                )

            # Create program records for the user

        db.commit()


if __name__ == "__main__":
    run()
