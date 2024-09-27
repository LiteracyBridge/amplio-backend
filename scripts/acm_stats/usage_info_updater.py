"""
Updates the usage_info table with the latest data for one/all program.
If a program is provided, only the usage info for that program is updated. Otherwise,
usage info for all programs is updated.

Usage: python usage_info_updater.py [program_id]
"""

import argparse
from typing import Optional

from jinja2 import Template
from sqlalchemy import text

from database import get_db

# Query to update the usage_info table with the latest data for one/all program.
# NB: Jinja2 templating is used to replace the program code in the query.
SQL_QUERY_TEMPLATE = """
-- Like contentinpackage, but with support for categories defined as a title from the ACM.
-- Such categories have the contentid as the categoryid.
-- Get the category name from categories or from contentmetadata2, as appropriate.
CREATE OR REPLACE TEMP VIEW content_cats_in_package AS (
    SELECT DISTINCT
        cip.project,
        cip.contentpackage,
        cip.contentid,
        cip.categoryid,
        cip.position,
        CASE WHEN cat.categoryname:: TEXT~~'General%':: TEXT
             THEN "substring"(cat.categoryname:: TEXT, 9):: CHARACTER VARYING
             ELSE CASE when categoryname IS NULL THEN title ELSE categoryname END
        END AS category,
        cm2.sdg_goals,
        cm2.sdg_targets
    FROM contentinpackage cip
    LEFT OUTER JOIN categories cat ON cip.categoryid=cat.categoryid AND cip.project=cat.projectcode
    LEFT OUTER JOIN contentmetadata2 cm2 ON cip.categoryid=cm2.contentid AND cip.project=cm2.project

    {% if project is not none %} -- Filter by project
        WHERE cip.project = '{{ project }}'
    {% endif %}
);


-- Adds the languagecode, title, format, and duration_seconds from contentmetadata2,
-- position (within playlist) from contentinpackage, and the category (name) from categories.
-- Commented out lines below swap in 'content_cats_in_package' to replace 'contentinpackage'
CREATE OR REPLACE TEMP VIEW usage_info_base_view AS (
    SELECT DISTINCT
      ps.timestamp,
      ps.project,
      ps.contentpackage,
      cm.languagecode,
      ps.recipientid,
      -- CASE WHEN cat.categoryname:: TEXT~~'General%':: TEXT
      --   THEN "substring"(cat.categoryname:: TEXT, 9):: CHARACTER VARYING
      -- ELSE cat.categoryname
      -- END             AS category,
      cp.category,
      cp.category as playlist,
      cp.sdg_goals,
      cp.sdg_targets,
      ps.contentid,
      cm.title,
      cm.format,
      cm.duration_sec AS duration_seconds,
      cp.position,
      --Use like: STRING_AGG(DISTINCT CAST(position AS TEXT), ';') AS position_list,
      ps.talkingbookid,
      ps.played_seconds,
      ps.completed as completions,
      ps.threequarters,
      ps.half,
      ps.quarter,
      ps.started,
      ps.tbcdid,
      ps.deployment_timestamp,
      ps.deployment_uuid
    FROM playstatistics ps
      JOIN contentmetadata2 cm
        ON ps.contentid = cm.contentid AND ps.project=cm.project
      JOIN content_cats_in_package cp
        ON ps.contentpackage ILIKE cp.contentpackage AND ps.contentid=cp.contentid
      -- JOIN contentinpackage cp
      --   ON ps.contentpackage ILIKE cp.contentpackage AND ps.contentid = cp.contentid
      -- JOIN categories cat
      --   ON cat.categoryid = cp.categoryid AND cat.projectcode=cp.project

    {% if project is not none %} -- Filter by project
        WHERE ps.project = '{{ project }}'
    {% endif %}
) ;

-- Adds the language name from language, deploymentnumber and startdate from deployments,
-- deployment (name) from packagesindeployment, and partner, affiliate, country,
-- region, district, communityname, groupname, and agent from recipients.
SELECT * INTO TEMPORARY TABLE usage_info_temp FROM (
  SELECT DISTINCT
      uib.timestamp,
      uib.project,

      d.deploymentnumber,
      d.deployment,
      d.deploymentname,
      d.startdate,
      uib.contentpackage,
      uib.languagecode,
      l.language,
      uib.recipientid,
      recip.partner,
      recip.affiliate,
      recip.country,
      recip.region,
      recip.district,
      recip.communityname,
      recip.groupname,
      recip.agent,
      recip.supportentity,
      uib.talkingbookid,

      uib.category,
      uib.playlist,
      uib.sdg_goals,
      uib.sdg_targets,
      uib.contentid,
      uib.title,
      uib.format,
      uib.duration_seconds,
      uib.position,

      uib.played_seconds,
      uib.completions,
      uib.threequarters,
      uib.half,
      uib.quarter,
      uib.started,
      uib.tbcdid,
      uib.deployment_timestamp,
      uib.deployment_uuid

    FROM
      usage_info_base_view uib
      JOIN packagesindeployment pid
        ON pid.project=uib.project AND pid.contentpackage ILIKE uib.contentpackage
      JOIN deployments d
        ON d.project=uib.project AND d.deployment = pid.deployment
      JOIN languages l ON l.projectcode = uib.project AND l.languagecode = uib.languagecode
      LEFT OUTER JOIN recipients recip
        ON uib.recipientid = recip.recipientid
 ) ui_temp ;

-- Update the usage_info table

{% if project is none %} -- We're updating all project, we need to delete the existing table first.
DELETE FROM usage_info;
{% endif %}

INSERT INTO usage_info SELECT * FROM usage_info_temp;

DROP TABLE usage_info_temp; -- Clean up the temporary table
"""


def update_usage_info(program: Optional[str]):
    db = next(get_db())

    if program is not None and program.strip() != "":
        print(f"Updating usage info for program: {program}")
        print(
            "BEFORE: Total usage_info records "
            + str(
                db.execute(
                    text("SELECT COUNT(*) FROM usage_info WHERE project = :project"),
                    {"project": program},
                ).fetchall()[0][0]
            )
        )
    else:
        print("Updating usage info for all programs")
        print(
            "BEFORE: Total usage_info records "
            + str(db.execute(text("SELECT COUNT(*) FROM usage_info")).fetchall()[0][0])
        )

    # Render the template with the actual project_id
    template = Template(SQL_QUERY_TEMPLATE)
    rendered_query = template.render(project=program if program != "" else None)

    db.execute(text(rendered_query))
    db.commit()

    print("Usage info updated successfully!")
    if program is not None:
        print(
            "AFTER: Total usage_info records "
            + str(
                db.execute(
                    text("SELECT COUNT(*) FROM usage_info WHERE project = :project"),
                    {"project": program},
                ).fetchall()[0][0]
            )
        )
    else:
        print(
            "AFTER: Total usage_info records "
            + str(db.execute(text("SELECT COUNT(*) FROM usage_info")).fetchall()[0][0])
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Updates the usage info of the program(s) in the database"
    )
    parser.add_argument(
        "program",
        action="store",
        type=str,
        nargs="?",
        default=None,
        help="ID of the program to update usage info. eg. 'SF-9RDMSAAG'. If not provided, updates usage info for all programs.",
    )

    args = parser.parse_args()
    update_usage_info(args.program)
