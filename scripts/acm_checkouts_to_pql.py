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
        INSERT INTO acm_checkout (
            last_in_name, last_in_version, last_in_comment, last_in_contact, acm_comment,
            acm_state, last_in_file_name, last_in_date, now_out_name, now_out_version,
            now_out_comment, now_out_contact, now_out_date, now_out_key,  project_id
        )
        SELECT :last_in_name, :last_in_version, :last_in_comment, :last_in_contact, :acm_comment,
            :acm_state, :last_in_file_name, :last_in_date, :now_out_name,
            :now_out_version, :now_out_comment, :now_out_contact, :now_out_date,
            :now_out_key, projects.id
        FROM projects
        WHERE (LOWER(projectcode) = :project_id) OR (LOWER(projectcode) = :project_id_2)
        LIMIT 1
        ON CONFLICT ON CONSTRAINT acm_checkout_project_id_key DO UPDATE SET last_in_name = EXCLUDED.last_in_name, last_in_version = EXCLUDED.last_in_version, last_in_comment = EXCLUDED.last_in_comment, last_in_contact = EXCLUDED.last_in_contact, acm_comment = EXCLUDED.acm_comment, acm_state = EXCLUDED.acm_state, last_in_file_name = EXCLUDED.last_in_file_name, last_in_date = EXCLUDED.last_in_date, now_out_name = EXCLUDED.now_out_name, now_out_version = EXCLUDED.now_out_version, now_out_comment = EXCLUDED.now_out_comment, now_out_contact = EXCLUDED.now_out_contact, now_out_date = EXCLUDED.now_out_date, now_out_key = EXCLUDED.now_out_key;
        """
        db.execute(
            sa.text(query),
            {
                "last_in_name": row.get("last_in_name", None),
                "last_in_version": row.get("last_in_version", None),
                "last_in_comment": row.get("last_in_comment", None),
                "last_in_contact": row.get("last_in_contact", None),
                "now_out_name": row.get("now_out_name", None),
                "now_out_contact": row.get("now_out_contact", None),
                "now_out_contact": row.get("now_out_contact", None),
                "now_out_version": row.get("now_out_version", None),
                "now_out_comment": row.get("now_out_comment", None),
                "now_out_computername": row.get("now_out_computername", None),
                "resettable": row.get("resettable", None),
                "now_out_key": row.get("now_out_key", None),
                "acm_comment": row.get("acm_comment", None),
                "acm_state": row["acm_state"],
                "last_in_file_name": row.get("last_in_file_name", None),
                "last_in_date": datetime.strptime(
                    row["last_in_date"], "%Y-%m-%d %H:%M:%S.%f"
                ).isoformat(),
                "now_out_date": (
                    None
                    if row.get("now_out_date", None) is None
                    else datetime.strptime(
                        row["now_out_date"], "%Y-%m-%d %H:%M:%S.%f"
                    ).isoformat()
                ),
                "project_id": row["acm_name"].lower(),
                "project_id_2": row["acm_name"].lower().replace("acm-", ""),
            },
        )

        db.commit()


if __name__ == "__main__":
    run()
