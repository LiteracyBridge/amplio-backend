"""Copies ACM checkouts from dynamo db to psql
"""

from datetime import datetime

import boto3
import sqlalchemy as sa

from database import get_db


def run():
    _dynamodb_resource = boto3.resource("dynamodb")
    db = next(get_db())

    # Copy organisations from dynamo db into psql
    checkout_id = _dynamodb_resource.Table("acm_check_out").scan()["Items"]

    for row in checkout_id:
        query = """
        INSERT INTO acm_checkout (last_in_name, last_in_version, last_in_comment, last_in_contact, acm_comment, acm_state, last_in_file_name, last_in_date, project_id)
        SELECT :last_in_name, :last_in_version, :last_in_comment, :last_in_contact, :acm_comment, :acm_state, :last_in_file_name, :last_in_date, projects.id
        FROM projects
        WHERE (LOWER(projectcode) = :project_id) OR (LOWER(projectcode) = :project_id_2)
        LIMIT 1
        ON CONFLICT (project_id) DO UPDATE SET last_in_name = EXCLUDED.last_in_name, last_in_version = EXCLUDED.last_in_version, last_in_comment = EXCLUDED.last_in_comment, last_in_contact = EXCLUDED.last_in_contact, acm_comment = EXCLUDED.acm_comment, acm_state = EXCLUDED.acm_state, last_in_file_name = EXCLUDED.last_in_file_name, last_in_date = EXCLUDED.last_in_date;
        """
        db.execute(
            sa.text(query),
            {
                "last_in_name": row.get("last_in_name", None),
                "last_in_version": row.get("last_in_version", None),
                "last_in_comment": row.get("last_in_comment", None),
                "last_in_contact": row.get("last_in_contact", None),
                "acm_comment": row.get("acm_comment", None),
                "acm_state": row["acm_state"],
                "last_in_file_name": row.get("last_in_file_name", None),
                "last_in_date": datetime.strptime(
                    row["last_in_date"], "%Y-%m-%d %H:%M:%S.%f"
                ).isoformat(),
                "project_id": row["acm_name"].lower(),
                "project_id_2": row["acm_name"].replace("ACM-", ""),
            },
        )

    db.commit()


if __name__ == "__main__":
    run()
