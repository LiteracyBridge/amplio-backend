from functools import reduce
from typing import Annotated, Any, Dict, Optional

import boto3 as boto3
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import exists, not_, select, text
from sqlalchemy.orm import Session, subqueryload

from models import Analysis
from models import UserFeedbackMessage as Message
from models import get_db
from models.uf_message_model import UserFeedbackMessage
from schema import ApiResponse

MINIMUM_SECONDS_FILTER = 0  # filters out any UF messages of less than this # of seconds
MAXIMUM_MINUTES_CHECKOUT = 5  # re-issues the same UUID after this many minutes if the form hasn't yet been submitted

router = APIRouter()


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
            Message.program_id == program,
            Message.deployment_number == deployment_number,
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


@router.get("/{program_id}")
def lambda_handler(
    program_id: str,
    deployment: str,
    language: str,
    message_id: Optional[str] = None,
    skipped_messages: Optional[str] = None,
    db: Session = Depends(get_db),
):
    # params = request.query_params

    print(skipped_messages)

    if deployment is None and language is None:
        HTTPException(status_code=400, detail="Missing required parameters")

    if skipped_messages is None or skipped_messages == "null" or skipped_messages == "":
        skipped_messages = []
    else:
        skipped_messages = skipped_messages.split(",")

    # If message id is provided, only query for that message and return it
    if message_id is not None and message_id != "null":
        result = (
            db.query(UserFeedbackMessage)
            .where(
                UserFeedbackMessage.message_uuid == message_id,
                UserFeedbackMessage.language == language,
                UserFeedbackMessage.program_id == program_id,
            )
            .options(
                subqueryload(UserFeedbackMessage.recipient),
                subqueryload(UserFeedbackMessage.content_metadata),
            )
            .first()
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Message not found")

        return ApiResponse(data=[result])

    # messages_to_skip = []

    # if skip and uuid is not None:
    #     messages_to_skip.append(uuid)

    subquery = select(Analysis.message_uuid).where(
        Analysis.message_uuid == Message.message_uuid
    )

    result = (
        db.query(Message)
        .where(
            Message.program_id == program_id,
            Message.deployment_number == deployment,
            Message.language == language,
            Message.length_seconds >= MINIMUM_SECONDS_FILTER,
            Message.message_uuid.notin_(skipped_messages),
            Message.message_uuid.not_in(subquery),
            Message.is_useless == None,
        )
        .options(
            subqueryload(UserFeedbackMessage.recipient),
            subqueryload(UserFeedbackMessage.content_metadata),
        )
        .order_by(Message.message_uuid)
        .first()
    )

    data = [result] if result is not None else []
    return ApiResponse(data=data)

    # start = time.time_ns()
    # uuid = None
    # deployment = None
    # language = None
    # skip = False

    # Parse out query string params
    # email = params.get("email", "").lower()
    # program_id = str(params.get("program"))
    # deployment = str(params["deployment"])
    # language = str(params["language"])
    # skipped_messages = params.get("skipped_messages[]", [])

    # print(skipped_messages)
    # if skipped message is not list, covert to list
    # if not isinstance(skipped_messages, list):
    #     skipped_messages = [skipped_messages]

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
    # result = get_uf_data(
    #     program=program_id,
    #     deployment_number=deployment,
    #     language=language,
    #     uuid=params.get(
    #         "uuid",
    #     ),
    #     skipped_messages=skipped_messages,
    #     db=db,
    # )

    # Return the response object
    # return ApiResponse(data=[result])
