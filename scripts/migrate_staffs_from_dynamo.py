"""Migration script to copy staffs from dynamo db into psql
"""

from datetime import datetime
from json import dumps

import boto3
import sqlalchemy as sa
from sqlalchemy.orm import Session

from database import get_db

role_names_map = {
    "*": "Administrator",
    "AD": "Administrator",
    "PM": "Program Manager",
    "CO": "Content Officer",
    "FO": "Field Officer",
}


def createDefaultRoles(orgId: int, db: Session):

    roles = [
        {
            "name": "Administrator",
            "permissions": {
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
            },
        },
        {
            "name": "Program Manager",
            "permissions": {
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
                "program": [
                    "manage_users",
                    "manage_specification",
                    "manage_program",
                ],
                "statistics": ["view_tb_analytics", "view_deployment_status"],
            },
        },
        {
            "name": "Content Officer",
            "permissions": {
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
                "program": [
                    "manage_users",
                    "manage_specification",
                    "manage_program",
                ],
            },
        },
        {
            "name": "Field Officer",
            "permissions": {
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
            },
        },
    ]

    for role in roles:
        db.execute(
            sa.text(
                "INSERT INTO roles (name, description, organisation_id, permissions, created_at, updated_at) VALUES (:name, :desc, :org, :permissions, :date, :date)"
            ).bindparams(
                date=datetime.now(),
                desc=f"{role['name']} role",
                name=role["name"],
                org=orgId,
                permissions=dumps(role["permissions"]),
            )
        )
    # db.commit()


def migrateOrganizations():
    ORGANIZATIONS_TABLE = "organizations"
    PROGRAMS_TABLE = "programs"

    _dynamodb_resource = boto3.resource("dynamodb")
    db = next(get_db())

    # Copy organisations from dynamo db into psql
    organizations = _dynamodb_resource.Table(ORGANIZATIONS_TABLE).scan()["Items"]
    for row in organizations:
        print(row)
        db.execute(
            sa.text(
                "INSERT INTO organisations (name, parent_id) VALUES (:name, (SELECT id FROM organisations WHERE name = :parent LIMIT 1)) ON CONFLICT DO NOTHING RETURNING id"
            ).bindparams(name=row["organization"], parent=row.get("parent", None)),
        )

        orgId = db.execute(
            sa.text("SELECT id FROM organisations WHERE name = :name").bindparams(
                name=row["organization"]
            )
        ).fetchone()

        if orgId is not None:
            createDefaultRoles(orgId[0], db=db)

    db.commit()

    # Copy programs from dynamo db into psql
    programs = _dynamodb_resource.Table(PROGRAMS_TABLE).scan()["Items"]
    for row in programs:
        # Skip programs which do not exists in programs table
        if row["program"] in [
            "MEDA",
            "UWR",
            "CBCC",
            "TEST-TS-NG",
            "CARE",
            "LBG-F",
            "LBG-FL",
            "TUDRIDEP",
            "CBCC-DEMO",
        ]:
            continue

        try:
            db.execute(
                sa.text(
                    "INSERT INTO organisation_programs (organisation_id, program_id, updated_at, deleted_at) VALUES ((SELECT id FROM organisations WHERE name = :org LIMIT 1), (SELECT id FROM programs WHERE program_id = :program LIMIT 1), :now, :now) ON CONFLICT DO NOTHING"
                ).bindparams(
                    org=row["organization"],
                    program=row.get("program"),
                    now=datetime.now(),
                )
            )
            db.commit()
        except (
            sa.exc.IntegrityError
        ) as e:  # Programs which do not exists in programs table will raise an error
            print(e)
            pass


def migrateUsers():
    _dynamodb_resource = boto3.resource("dynamodb")
    db = next(get_db())

    # Copy organisations from dynamo db into psql
    organizations = _dynamodb_resource.Table("organizations").scan()["Items"]
    programs = _dynamodb_resource.Table("programs").scan()["Items"]

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

    for row in programs:
        program_id = row["program"]
        staffs = row.get("roles", {})

        # Create staffs
        for email, S in staffs.items():
            user = db.execute(
                sa.text("SELECT id FROM users WHERE email=:email LIMIT 1").bindparams(
                    email=email
                )
            ).fetchall()
            if len(user) == 0:
                continue

            program = db.execute(
                sa.text(
                    "SELECT id FROM programs WHERE program_id=:program_id LIMIT 1"
                ).bindparams(program_id=program_id)
            ).fetchall()

            if len(program) == 0:
                continue

            staffId = db.execute(
                sa.text(
                    "INSERT INTO program_users (user_id, program_id, created_at, updated_at) VALUES (:user_id, :program_id, :date, :date) ON CONFLICT DO NOTHING RETURNING (user_id, program_id)"
                ).bindparams(
                    user_id=user[0][0],
                    program_id=program[0][0],
                    date=datetime.now(),
                ),
            ).fetchall()

        db.commit()


if __name__ == "__main__":
    migrateOrganizations()
    migrateUsers()
