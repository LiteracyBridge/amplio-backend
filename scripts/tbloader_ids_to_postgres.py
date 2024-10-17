"""Copies TB Loader ids data from dynamo db to psql
"""

import boto3
import sqlalchemy as sa

from database import get_db


def run():
    _dynamodb_resource = boto3.resource("dynamodb")
    db = next(get_db())

    # Copy organisations from dynamo db into psql
    checkout_id = _dynamodb_resource.Table("TbLoaderIds").scan()["Items"]

    for row in checkout_id:
        query = """
        INSERT INTO tb_loader_ids (
            email, reserved, tb_loader_id, hex_id, max_tb_loader, created_at, updated_at
        ) VALUES (:email, :reserved, :tb_loader_id, :hex_id, :max, NOW(), NOW())
        ON CONFLICT ON CONSTRAINT uniq_email DO UPDATE SET reserved = EXCLUDED.reserved, tb_loader_id = EXCLUDED.tb_loader_id, hex_id = EXCLUDED.hex_id, max_tb_loader = EXCLUDED.max_tb_loader, updated_at = NOW()
        """
        db.execute(
            sa.text(query),
            {
                "email": row.get("email", None),
                "reserved": row.get("reserved", None),
                "tb_loader_id": row.get("tbloaderid", None),
                "hex_id": row.get("hexid", None),
                "max": row.get("maxtbloader", None),
            },
        )

        db.commit()


if __name__ == "__main__":
    run()
