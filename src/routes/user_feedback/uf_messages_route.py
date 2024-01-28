from functools import reduce
from typing import Annotated, Any, Dict, Optional

import boto3 as boto3
from amplio.rolemanager import manager
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pg8000 import Connection, Cursor
from sqlalchemy import exists, not_, select, text
from sqlalchemy.orm import Session

from models import Analysis
from models import UserFeedbackMessage as Message
from models import get_db
from schema import ApiResponse

MINIMUM_SECONDS_FILTER = 0  # filters out any UF messages of less than this # of seconds
MAXIMUM_MINUTES_CHECKOUT = 5  # re-issues the same UUID after this many minutes if the form hasn't yet been submitted

router = APIRouter()


def get_last_program_deployment_language(connection, email):
    command = """SELECT programid,deploymentnumber,language
                    FROM uf_analysis a
                    JOIN uf_messages m
                    ON a.message_uuid=m.message_uuid
                    WHERE analyst_email = :email
                    ORDER BY start_time DESC
                    LIMIT 1"""
    sqlLast = connection.run(command, email=email)
    if len(sqlLast) == 1:
        context = {}
        context["selectedProgramCode"] = sqlLast[0][0]
        context["selectedDeployment"] = sqlLast[0][1]
        context["selectedLanguageCode"] = sqlLast[0][2]
    else:
        context = None
    return context


def get_program_list(connection, email):
    # TODO: query user programs
    manager.open_tables()
    programsAuthorized = (
        "'" + "','".join(manager.get_programs_for_user(email.lower())) + "'"
    )
    command = """SELECT DISTINCT p.projectcode, p.project, GREATEST(m.deploymentnumber, q.deploymentnumber), l.languagecode, l.language
                    JOIN projects p ON p UserFeedbackMessage as.projectcode=l.projectcode
                    LEFT JOIN uf_messages m ON m UserFeedbackMessage as.programid = p.projectcode and l.languagecode=m.language and d.deploymentnumber=m.deploymentnumber
					LEFT JOIN uf_questions q ON q.programid = p.projectcode and l.languagecode=q.language and d.deploymentnumber=q.deploymentnumber
					WHERE (m.deploymentnumber is not null OR q.deploymentnumber is not null)
                    AND p.active AND p.projectcode IN ("""
    command += programsAuthorized
    command += ") ORDER BY p.project,GREATEST(m.deploymentnumber, q.deploymentnumber),l.language"
    rows = connection.run(command)
    programs = []
    program = {}
    deployment = {}
    lastDeployment = None

    for row in rows:
        program_code = row[0]
        program_name = row[1]
        deployment_number = row[2]
        language_code = row[3]
        language_name = row[4]
        if len(program) > 0 and program["code"] == program_code:
            if deployment_number == deployment["number"]:
                deployment["languages"].append(language_code)
            else:
                deployment = {}
                deployment["number"] = deployment_number
                deployment["languages"] = [language_code]
                program["deployments"].append(deployment)
            if language_code not in map(lambda l: l["code"], program["languages"]):
                language = {}
                language["code"] = language_code
                language["name"] = language_name
                program["languages"].append(language)
        else:
            program = {}
            program["code"] = program_code
            program["name"] = program_name

            deployment = {}
            deployment["number"] = deployment_number
            deployment["languages"] = [language_code]
            program["deployments"] = [deployment]

            language = {}
            language["code"] = language_code
            language["name"] = language_name
            program["languages"] = [language]

            programs.append(program)

    if len(rows) == 0:
        programs = None

    context = get_last_program_deployment_language(connection, email)
    if context is None and programs is not None:
        context = {}
        context["selectedProgramCode"] = programs[0]["code"]
        context["selectedDeployment"] = programs[0]["deployments"][0]["number"]
        context["selectedLanguageCode"] = programs[0]["deployments"][0]["languages"][0]

    all_data = {}
    if programs is not None:
        all_data["programs"] = programs
    if context is not None:
        all_data["context"] = context
    return all_data


def get_submissions_list(
    connection, program, deployment_number, language, email, timezoneOffset
):
    command = (
        """SELECT a.message_uuid, date_trunc('second',submit_time AT TIME ZONE INTERVAL ' """
        + timezoneOffset
        + """ '),is_useless,
                    region,district,communityname,groupname
                    FROM uf_messages m
                    JOIN uf_analysis a ON m.message_uuid = a.message_uuid
                    JOIN recipients r ON m.recipientid = r.recipientid
                    LEFT JOIN contentmetadata2 c ON m.relation = c.contentid
                    WHERE m.programid = :program and m.deploymentnumber = :deployment_number
                    and m.length_seconds >= :min_sec and m.language = :language
                    and submit_time IS NOT NULL and analyst_email = :email
                    ORDER BY submit_time DESC"""
    )
    sqlSubmissions = connection.run(
        command,
        program=program,
        deployment_number=deployment_number,
        language=language,
        email=email,
        timezoneOffset=timezoneOffset,
        min_sec=MINIMUM_SECONDS_FILTER,
    )
    submissions = []
    for s in sqlSubmissions:
        submission = {}
        submission["uuid"] = s[0]
        submission["submissionTime"] = s[1]
        submission["feedback"] = "no" if s[2] else "yes"
        submission["location"] = s[5] + ", " + s[4] + ", " + s[3]
        submission["group"] = s[6]
        submissions.append(submission)
    return submissions


def to_array(text):
    arr = []
    return arr


def get_submission(connection, uuid):
    MAX_RESPONSES = 30
    columns = []
    sql = 'SELECT "is_useless", '
    for r in range(1, MAX_RESPONSES + 1):
        column = "resp_" + ("0" + str(r) if r < 10 else str(r))
        columns.append(column)
        sql += '"' + column + '",'
        column += "_o"
        columns.append(column)
        sql += '"' + column + '",'
    sql = sql.rstrip(",") + " FROM uf_analysis WHERE message_uuid = '" + uuid + "'"
    sqlResult = connection.run(sql)
    submission = {}
    submission["uuid"] = uuid
    submission["useless"] = sqlResult[0][0]
    responses = {}
    for r in range(1, MAX_RESPONSES * 2):
        value = sqlResult[0][r]
        responses[columns[r - 1]] = value
    submission["responses"] = responses
    return submission


def get_next_uuid(
    program: str,
    deployment_number: str,
    language: str,
    db: Session,
    uuid: Optional[str] = None,
    skipped_messages: list[str] | None = None,
):
    if skipped_messages is None:
        skipped_messages = []

    if uuid is not None:
        skipped_messages.append(uuid)

    # messages_to_skip = []

    # if skip and uuid is not None:
    #     messages_to_skip.append(uuid)

    subquery = select(Analysis.message_uuid).where(
        Analysis.message_uuid == Message.message_uuid
    )

    query = (
        db.query(Message)
        .where(
            Message.programid == program,
            Message.deploymentnumber == deployment_number,
            Message.language == language,
            Message.length_seconds >= MINIMUM_SECONDS_FILTER,
            Message.message_uuid.notin_(skipped_messages),
            Message.message_uuid.not_in(subquery),
            Message.is_useless == None,
        )
        .order_by(Message.message_uuid)
    )

    # query = (
    #     db.query(Message)
    #     .distinct(Message.message_uuid)
    #     # Left join to get messages that have not been analyzed
    #     .join(Analysis, Message.message_uuid != Analysis.message_uuid)
    #     .filter(
    #         Message.programid == program,
    #         Message.deploymentnumber == deployment_number,
    #         Message.language == language,
    #         Message.length_seconds >= MINIMUM_SECONDS_FILTER,
    #         Message.message_uuid.notin_(skipped_messages),
    #     )
    #     .order_by(Message.message_uuid)
    #     # .first()
    # )

    print(query.with_labels().statement)
    print(query.first())
    print("query here")
    # processed_messages = (
    #     db.query(Message.message_uuid)
    #     .join(Analysis, Message.message_uuid == Analysis.message_uuid)
    #     .filter(Analysis.analyst_email == user_email)
    # )

    # command = """INSERT INTO uf_analysis (message_uuid,start_time,analyst_email)
    #                 SELECT message_uuid, NOW(), CAST(:email AS VARCHAR) FROM public.uf_messages
    #                 WHERE programid = :program and deploymentnumber = :deployment_number
    #                 and length_seconds >= :min_sec and language= :language and
    #                 ( """
    # if not skip:
    #     # the following clause gives a previously checked-out uuid back to the requester
    #     # but if we want to skip the current one, we do not include this clause
    #     command += """  message_uuid IN (SELECT message_uuid FROM uf_analysis
    #                 	WHERE submit_time IS NULL AND analyst_email = :email)
    #                 	OR"""
    # command += """  message_uuid NOT IN
    #                     (SELECT message_uuid FROM uf_analysis
    #                     WHERE submit_time IS NOT NULL
    #                     OR start_time > (NOW() - :max_min * interval '1 minute'))
    #                 )
    #                 ORDER BY message_uuid LIMIT 1
    #             ON CONFLICT (message_uuid) DO UPDATE SET start_time=NOW(),analyst_email=:email
    #             RETURNING message_uuid"""

    # resp = connection.run(
    #     command,
    #     email=user_email,
    #     program=program,
    #     deployment_number=deployment_number,
    #     language=language,
    #     min_sec=MINIMUM_SECONDS_FILTER,
    #     max_min=MAXIMUM_MINUTES_CHECKOUT,
    # )
    return query.first()


def get_uuid_metadata(uuid: str, db: Session):
    audioMetadata = {}
    command = text(
        """SELECT title, region, district, communityname,groupname, listening_model
            FROM uf_messages m
            JOIN recipients r
                ON m.recipientid = r.recipientid
            LEFT JOIN contentmetadata2 c
                ON m.relation = c.contentid
            WHERE message_uuid = :uuid"""
    )

    sqlmeta = db.execute(command, {"uuid": uuid}).fetchall()[0]
    print(sqlmeta)

    # sqlmeta = connection.run(command, uuid=uuid)[0]
    audioMetadata.update({"title": sqlmeta[0]})
    audioMetadata.update({"region": sqlmeta[1]})
    audioMetadata.update({"district": sqlmeta[2]})
    audioMetadata.update({"community": sqlmeta[3]})
    audioMetadata.update({"group": sqlmeta[4]})
    audioMetadata.update({"listening_model": sqlmeta[5]})
    return audioMetadata


def num_from_array(array):
    if len(array) == 0:  # empty array = 0
        return 0
    elif len(array) == 1:  # filtered array value is element 3
        return array[0][3]
    else:  # if len>1 then add up all values of the 3rd element (needed for not_analyzed)
        return reduce(lambda y, sum: sum + y, map(lambda x: x[3], array))


def get_progress(connection, user_email, program, deployment_number, language):
    progress = {}
    command = """SELECT (submit_time IS NULL), (analyst_email=:user), m.is_useless, count(*)
                    FROM uf_messages m
                    LEFT JOIN uf_analysis a
                    ON a.message_uuid=m.message_uuid
                    WHERE m.programid=:program AND deploymentnumber=:deployment_number AND language=:language
                    AND length_seconds >= :min_length
                    GROUP BY (submit_time IS NULL),(analyst_email=:user),is_useless
                    ORDER BY (submit_time IS NULL),(analyst_email=:user),is_useless"""
    sqlprogress = connection.run(
        command,
        user=user_email,
        program=program,
        deployment_number=deployment_number,
        language=language,
        min_length=MINIMUM_SECONDS_FILTER,
    )
    other_feedback = num_from_array(
        list(filter(lambda r: r[1] == False and r[2] == False, sqlprogress))
    )
    other_useless = num_from_array(
        list(filter(lambda r: r[1] == False and r[2] == True, sqlprogress))
    )
    user_feedback = num_from_array(
        list(filter(lambda r: r[1] == True and r[2] == False, sqlprogress))
    )
    user_useless = num_from_array(
        list(filter(lambda r: r[1] == True and r[2] == True, sqlprogress))
    )
    not_analyzed = num_from_array(list(filter(lambda r: r[0] == True, sqlprogress)))

    user_recordings = user_feedback + user_useless
    other_recordings = other_feedback + other_useless
    all_recordings = user_recordings + other_recordings + not_analyzed

    progress.update({"others_feedback": other_feedback})
    progress.update({"others_recordings": other_recordings})
    progress.update({"users_feedback": user_feedback})
    progress.update({"users_recordings": user_recordings})
    progress.update({"totalReceivedMessages": all_recordings})
    return progress


def get_uf_data(
    program: str,
    deployment_number: str,
    language: str,
    uuid: Optional[str],
    db: Session,
    skipped_messages: list[str] | None = None,
):
    all_data = {"audioMetadata": {}, "progress": {}}
    url = ""  # empty string means no more messages available to process
    # uuid = None
    message: Message | None = None

    # if skip or uuid is None:
    message = get_next_uuid(
        program=program,
        deployment_number=deployment_number,
        language=language,
        db=db,
        skipped_messages=skipped_messages,
        uuid=uuid,
    )
    uuid = message.message_uuid if message is not None else None

    # if len(sqlResponse) > 0:
    #     uuid = sqlResponse[0][0]
    # else:
    #     all_data["audioMetadata"].update(
    #         {"submission": get_submission(connection, uuid)}
    #     )
    # check if there are any uf_messages to process for this program/deployment/language
    if uuid is not None and message is not None:
        metadata = get_uuid_metadata(uuid=uuid, db=db)
        metadata.update({"uuid": uuid, "transcription": message.transcription})
        all_data["audioMetadata"].update(metadata)
        # form the URL
        url = (
            "https://amplio-uf.s3.us-west-2.amazonaws.com/collected/"
            + program
            + "/"
            + deployment_number
        )
        url += "/" + uuid + ".mp3"

    all_data["audioMetadata"].update(
        {"url": url}
    )  # empty string url means no more messages to process

    # progress = get_progress(
    #     connection, user_email, program, deployment_number, language
    # )
    # all_data["progress"].update(progress)

    # connection.close
    return all_data


@router.get("")
def lambda_handler(
    request: Request,
    skipped_messages: Annotated[
        list[str] | None, Query(alias="skipped_messages[]")
    ] = [],
    db: Session = Depends(get_db),
):
    params = request.query_params

    print(params)
    # start = time.time_ns()
    # uuid = None
    # deployment = None
    # language = None
    # skip = False

    # Parse out query string params
    email = params.get("email", "").lower()
    program = str(params.get("program"))
    deployment = str(params["deployment"])
    language = str(params["language"])
    # skipped_messages = params.get("skipped_messages[]", [])

    # print(skipped_messages)
    # if skipped message is not list, covert to list
    # if not isinstance(skipped_messages, list):
    #     skipped_messages = [skipped_messages]

    if program is None and deployment is None and language is None:
        HTTPException(status_code=400, detail="Missing required parameters")

    # if "deployment" in params:
    # if "language" in params:
    # if "uuid" in params:
    #     uuid = params["uuid"]
    # if "timezoneOffset" in params:
    #     timezoneOffset = params["timezoneOffset"]
    # if "skip" in params:
    #     skip = True

    # connection: Connection = get_db_connection()

    # Get body of response object, depending on type of request
    # if uuid == "all":
    #     result = get_submissions_list(
    #         connection, program, deployment, language, email, params["timezoneOffset"]
    #     )
    # elif program == "all":
    #     result = get_program_list(connection, email)
    # else:
    result = get_uf_data(
        program=program,
        deployment_number=deployment,
        language=language,
        uuid=params.get(
            "uuid",
        ),
        skipped_messages=skipped_messages,
        db=db,
    )

    # Return the response object
    return ApiResponse(data=[result])
