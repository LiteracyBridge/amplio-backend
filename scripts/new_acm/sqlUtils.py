from sqlalchemy.sql import text

from database import get_db
from models.program_model import Project

connction_overrides = ["host", "port", "user", "password", "database"]
connection_params = {}

# This will be a connection to the PostgreSQL database
db_connection = None


# noinspection SqlResolve,SqlNoDataSourceInspection
def check_for_postgresql_project(program_id) -> bool:
    """
    Checks to see if the project exists in the PostgerSQL projects table.
    :param program_id: to be checked.
    :return: True if there is no existing project record, False if there already is one.
    """
    print(f"Looking for program '{program_id}' in PostgreSQL...", end="")

    cur = next(get_db())
    cur.execute(text("SELECT projectcode FROM projects;"))
    rows = [x[0] for x in cur]

    if program_id in rows:
        print("\n  {} exists in PostgreSQL projects table".format(program_id))
        return False

    print("ok")
    return True


# noinspection SqlResolve,SqlNoDataSourceInspection
def populate_postgresql(program_id: str, comment: str) -> bool:
    """
    Adds the project's row to the projects table in PostgreSQL
    :param program_id: to be added
    :param comment: what the customer calls the program
    :return: True if successful, False if not
    """
    print(f"Adding '{program_id}' to PostgreSQL projects table...", end="")
    cur = next(get_db())
    cur.execute(text("SELECT MAX(id) FROM projects;"))
    rows = [x[0] for x in cur]
    new_id = max(rows) + 1

    project = Project()
    project.id = new_id
    project.active = True
    project.code = program_id
    project.name = comment

    cur.add(project)
    cur.commit()

    # The programs table looks like this:
    # {
    #     "listening_models": [],
    #     "sustainable_development_goals": [],
    #     "deployments_count": 1,
    #     "deployments_length": "one_quarter",
    #     "deployments_first": $(TOMORROW),
    #     "feedback_frequency": "weekly",
    #     "projectcode": ${PROGRAMID},
    #     "languages": [
    #         "eng"
    #     ],
    #     "country": "Afghanistan",
    #     "region": [],
    #     "direct_beneficiaries_map": {
    #         "male": "Number of Male",
    #         "female": "Number of Female",
    #         "youth": "Number of Youth"
    #     },
    #     "direct_beneficiaries_additional_map": {},
    #     "affiliate": "",
    #     "partner": ""
    # }
    # Here's a sample from a newly-added program:
    #
    # dashboard=> select * from programs where program_id = 'CRS-GH-ICO';
    # -[ RECORD 1 ]-----------------------+-------------------------------------------------------------------------------------
    # id                                  | 202
    # sustainable_development_goals       | [5, 6]
    # deployments_count                   | 1
    # deployments_length                  | one_quarter
    # deployments_first                   | 2022-06-01
    # feedback_frequency                  | quarterly
    # program_id                          | CRS-GH-ICO
    # languages                           | ["gur", "talni", "maw"]
    # country                             | Ghana
    # region                              | ["North East", "Upper East"]
    # direct_beneficiaries_map            | {"male": "Number of Male", "female": "Number of Female", "youth": "Number of Youth"}
    # direct_beneficiaries_additional_map | {}
    # affiliate                           |
    # partner                             |
    # listening_models                    | ["Groups"]

    return True
