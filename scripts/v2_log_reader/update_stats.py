#!/usr/bin/env python3

import sys

from sqlalchemy import text

from database import get_db


def main():
    db = next(get_db())

    # Define the SQL queries
    queries = [
        # Query 1: Update playstatistics
        """
        BEGIN TRANSACTION;
        -- Create a table with the right shape.
        CREATE TEMPORARY TABLE ps AS (SELECT * FROM playstatistics WHERE FALSE);
        -- Populate from CSV
        COPY ps FROM 'playstatistics.csv' CSV HEADER;
        -- SELECT project, talkingbookid from ps;
        INSERT INTO playstatistics SELECT * FROM ps
            ON CONFLICT ON CONSTRAINT playstatistics_pk DO
                UPDATE SET
                    contentpackage=EXCLUDED.contentpackage,
                    community=EXCLUDED.community,
                    started=EXCLUDED.started,
                    quarter=EXCLUDED.quarter,
                    half=EXCLUDED.half,
                    threequarters=EXCLUDED.threequarters,
                    completed=EXCLUDED.completed,
                    played_seconds=EXCLUDED.played_seconds,
                    survey_taken=EXCLUDED.survey_taken,
                    survey_applied=EXCLUDED.survey_applied,
                    survey_useless=EXCLUDED.survey_useless,
                    stats_timestamp=EXCLUDED.stats_timestamp,
                    deployment_timestamp=EXCLUDED.deployment_timestamp,
                    recipientid=EXCLUDED.recipientid,
                    deployment_uuid=EXCLUDED.deployment_uuid;
        """,
        # Query 2: Update tbsdeployed
        """
        -- Create a table with the right shape.
        CREATE TEMPORARY TABLE ds AS (SELECT * FROM tbsdeployed WHERE FALSE);
        -- Populate from CSV
        COPY ds FROM 'tbsdeployed.csv' CSV HEADER;
        INSERT INTO tbsdeployed SELECT * FROM ds
            ON CONFLICT ON CONSTRAINT tbdeployments_pkey DO
                UPDATE SET
                    recipientid=EXCLUDED.recipientid,
                    project=EXCLUDED.project,
                    deployment=EXCLUDED.deployment,
                    contentpackage=EXCLUDED.contentpackage,
                    firmware=EXCLUDED.firmware,
                    location=EXCLUDED.location,
                    coordinates=EXCLUDED.coordinates,
                    username=EXCLUDED.username,
                    tbcdid=EXCLUDED.tbcdid,
                    action=EXCLUDED.action,
                    newsn=EXCLUDED.newsn,
                    testing=EXCLUDED.testing;
        """,
        # Query 3: Select project, tb_version, and count
        """
        SELECT DISTINCT project, tb_version, COUNT(DISTINCT talkingbookid) FROM (
            SELECT project, recipientid, talkingbookid,
                CASE WHEN talkingbookid ILIKE '%.%.%.%' THEN 'TB-2' ELSE 'TB-1' END AS tb_version
            FROM tbsdeployed
        ) tbc GROUP BY project, tb_version ORDER BY tb_version, project;
        """,
        # Query 4: Select timestamp, project, deployment, and talkingbookid
        """
        SELECT DISTINCT timestamp, project, deployment, talkingbookid FROM playstatistics WHERE talkingbookid ILIKE '%.%.%.%' LIMIT 10;
        """,
        # Commit the transaction
        "COMMIT;",
    ]

    # Execute the queries
    for query in queries:
        db.execute(text(query))

    db.commit()


if __name__ == "__main__":
    # Retrieve playstatistics.csv path from the command line
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <playstatistics.csv>")
        sys.exit(1)
