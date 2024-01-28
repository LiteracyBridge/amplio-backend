# import json
# import time
# import traceback
# from typing import Any, Dict, Optional

# import boto3 as boto3
# import pg8000.native
# from botocore.exceptions import ClientError
# from pg8000 import Connection, Cursor
# from amplio.rolemanager import manager
# from functools import reduce
# from config import settings
# from fastapi import APIRouter, Request
# from schema import ApiResponse

# MINIMUM_SECONDS_FILTER = 5  # filters out any UF messages of less than this # of seconds
# MAXIMUM_MINUTES_CHECKOUT = 5  # re-issues the same UUID after this many minutes if the form hasn't yet been submitted

# router = APIRouter()

# ########################################################################################################################
# # Get a database connection


# # def _get_secret() -> dict:
# #     # Name of the secrets in secrets manager.
# #     secret_name = "lb_stats_access2"  # lb_stats_test
# #     region_name = "us-west-2"

# #     result = None

# #     start = time.time()

# #     # Create a Secrets Manager client
# #     try:
# #         session = boto3.session.Session()
# #         client = session.client(service_name="secretsmanager", region_name=region_name)
# #     except Exception as e:
# #         print(
# #             "    Exception getting session client: {}, elapsed: {}".format(
# #                 str(e), time.time() - start
# #             )
# #         )
# #         raise e

# #     # In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
# #     # See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
# #     # We rethrow the exception by default.

# #     try:
# #         get_secret_value_response = client.get_secret_value(SecretId=secret_name)
# #     except ClientError as e:
# #         if e.response["Error"]["Code"] == "DecryptionFailureException":
# #             # Secrets Manager can't decrypt the protected secret text using the provided KMS key.
# #             # Deal with the exception here, and/or rethrow at your discretion.
# #             raise e
# #         elif e.response["Error"]["Code"] == "InternalServiceErrorException":
# #             # An error occurred on the server side.
# #             # Deal with the exception here, and/or rethrow at your discretion.
# #             raise e
# #         elif e.response["Error"]["Code"] == "InvalidParameterException":
# #             # You provided an invalid value for a parameter.
# #             # Deal with the exception here, and/or rethrow at your discretion.
# #             raise e
# #         elif e.response["Error"]["Code"] == "InvalidRequestException":
# #             # You provided a parameter value that is not valid for the current state of the resource.
# #             # Deal with the exception here, and/or rethrow at your discretion.
# #             raise e
# #         elif e.response["Error"]["Code"] == "ResourceNotFoundException":
# #             # We can't find the resource that you asked for.
# #             # Deal with the exception here, and/or rethrow at your discretion.
# #             raise e
# #         else:
# #             raise e
# #     else:
# #         # Decrypts secret using the associated KMS CMK.
# #         # Depending on whether the secret is a string or binary, one of these fields will be populated.
# #         if "SecretString" in get_secret_value_response:
# #             secret = get_secret_value_response["SecretString"]
# #             result = json.loads(secret)
# #         # else:
# #         # Our secrets are text, so we don't need this.
# #         #     decoded_binary_secret = base64.b64decode(get_secret_value_response['SecretBinary'])
# #         #     result = decoded_binary_secret

# #     # Your code goes here.
# #     return result


# _db_connection: Optional[Connection] = None


# def get_db_connection() -> Connection:
#     global _db_connection

#     if _db_connection is None:
#         # secret = _get_secret()

#         parms = {
#             "database": settings.db_name,
#             "user": settings.db_user,
#             "password": settings.db_password,
#             "host": settings.db_host,
#             "port": settings.db_port,
#         }

#         _db_connection = pg8000.native.Connection(**parms)

#     return _db_connection


# ########################################################################################################################


# def get_last_program_deployment_language(connection, email):
#     command = """SELECT programid,deploymentnumber,language
#                     FROM uf_analysis a
#                     JOIN uf_messages m
#                     ON a.message_uuid=m.message_uuid
#                     WHERE analyst_email = :email
#                     ORDER BY start_time DESC
#                     LIMIT 1"""
#     sqlLast = connection.run(command, email=email)
#     if len(sqlLast) == 1:
#         context = {}
#         context["selectedProgramCode"] = sqlLast[0][0]
#         context["selectedDeployment"] = sqlLast[0][1]
#         context["selectedLanguageCode"] = sqlLast[0][2]
#     else:
#         context = None
#     return context


# def get_program_list(connection, email):
#     manager.open_tables()
#     programsAuthorized = (
#         "'" + "','".join(manager.get_programs_for_user(email.lower())) + "'"
#     )
#     command = """SELECT DISTINCT p.projectcode, p.project, GREATEST(m.deploymentnumber, q.deploymentnumber), l.languagecode, l.language
#                     FROM languages l
#                     JOIN projects p ON p.projectcode=l.projectcode
#                     JOIN deployments d ON p.projectcode=d.project
#                     LEFT JOIN uf_messages m ON m.programid = p.projectcode and l.languagecode=m.language and d.deploymentnumber=m.deploymentnumber
# 					LEFT JOIN uf_questions q ON q.programid = p.projectcode and l.languagecode=q.language and d.deploymentnumber=q.deploymentnumber
# 					WHERE (m.deploymentnumber is not null OR q.deploymentnumber is not null)
#                     AND p.active AND p.projectcode IN ("""
#     command += programsAuthorized
#     command += ") ORDER BY p.project,GREATEST(m.deploymentnumber, q.deploymentnumber),l.language"
#     rows = connection.run(command)
#     programs = []
#     program = {}
#     deployment = {}
#     lastDeployment = None

#     for row in rows:
#         program_code = row[0]
#         program_name = row[1]
#         deployment_number = row[2]
#         language_code = row[3]
#         language_name = row[4]
#         if len(program) > 0 and program["code"] == program_code:
#             if deployment_number == deployment["number"]:
#                 deployment["languages"].append(language_code)
#             else:
#                 deployment = {}
#                 deployment["number"] = deployment_number
#                 deployment["languages"] = [language_code]
#                 program["deployments"].append(deployment)
#             if language_code not in map(lambda l: l["code"], program["languages"]):
#                 language = {}
#                 language["code"] = language_code
#                 language["name"] = language_name
#                 program["languages"].append(language)
#         else:
#             program = {}
#             program["code"] = program_code
#             program["name"] = program_name

#             deployment = {}
#             deployment["number"] = deployment_number
#             deployment["languages"] = [language_code]
#             program["deployments"] = [deployment]

#             language = {}
#             language["code"] = language_code
#             language["name"] = language_name
#             program["languages"] = [language]

#             programs.append(program)

#     if len(rows) == 0:
#         programs = None

#     context = get_last_program_deployment_language(connection, email)
#     if context is None and programs is not None:
#         context = {}
#         context["selectedProgramCode"] = programs[0]["code"]
#         context["selectedDeployment"] = programs[0]["deployments"][0]["number"]
#         context["selectedLanguageCode"] = programs[0]["deployments"][0]["languages"][0]

#     all_data = {}
#     if programs is not None:
#         all_data["programs"] = programs
#     if context is not None:
#         all_data["context"] = context
#     return all_data


# def get_submissions_list(
#     connection, program, deployment_number, language, email, timezoneOffset
# ):
#     command = (
#         """SELECT a.message_uuid, date_trunc('second',submit_time AT TIME ZONE INTERVAL ' """
#         + timezoneOffset
#         + """ '),is_useless,
#                     region,district,communityname,groupname
#                     FROM uf_messages m
#                     JOIN uf_analysis a ON m.message_uuid = a.message_uuid
#                     JOIN recipients r ON m.recipientid = r.recipientid
#                     LEFT JOIN contentmetadata2 c ON m.relation = c.contentid
#                     WHERE m.programid = :program and m.deploymentnumber = :deployment_number
#                     and m.length_seconds >= :min_sec and m.language = :language
#                     and submit_time IS NOT NULL and analyst_email = :email
#                     ORDER BY submit_time DESC"""
#     )
#     sqlSubmissions = connection.run(
#         command,
#         program=program,
#         deployment_number=deployment_number,
#         language=language,
#         email=email,
#         timezoneOffset=timezoneOffset,
#         min_sec=MINIMUM_SECONDS_FILTER,
#     )
#     submissions = []
#     for s in sqlSubmissions:
#         submission = {}
#         submission["uuid"] = s[0]
#         submission["submissionTime"] = s[1]
#         submission["feedback"] = "no" if s[2] else "yes"
#         submission["location"] = s[5] + ", " + s[4] + ", " + s[3]
#         submission["group"] = s[6]
#         submissions.append(submission)
#     return submissions


# def to_array(text):
#     arr = []
#     return arr


# def get_submission(connection, uuid):
#     MAX_RESPONSES = 30
#     columns = []
#     sql = 'SELECT "is_useless", '
#     for r in range(1, MAX_RESPONSES + 1):
#         column = "resp_" + ("0" + str(r) if r < 10 else str(r))
#         columns.append(column)
#         sql += '"' + column + '",'
#         column += "_o"
#         columns.append(column)
#         sql += '"' + column + '",'
#     sql = sql.rstrip(",") + " FROM uf_analysis WHERE message_uuid = '" + uuid + "'"
#     sqlResult = connection.run(sql)
#     submission = {}
#     submission["uuid"] = uuid
#     submission["useless"] = sqlResult[0][0]
#     responses = {}
#     for r in range(1, MAX_RESPONSES * 2):
#         value = sqlResult[0][r]
#         responses[columns[r - 1]] = value
#     submission["responses"] = responses
#     return submission


# def get_next_uuid(connection, user_email, program, deployment_number, language, skip):
#     command = """INSERT INTO uf_analysis (message_uuid,start_time,analyst_email)
#                     SELECT message_uuid, NOW(), CAST(:email AS VARCHAR) FROM public.uf_messages
#                     WHERE programid = :program and deploymentnumber = :deployment_number
#                     and length_seconds >= :min_sec and language= :language and
#                     ( """
#     if not skip:
#         # the following clause gives a previously checked-out uuid back to the requester
#         # but if we want to skip the current one, we do not include this clause
#         command += """  message_uuid IN (SELECT message_uuid FROM uf_analysis
#                     	WHERE submit_time IS NULL AND analyst_email = :email)
#                     	OR"""
#     command += """  message_uuid NOT IN
#                         (SELECT message_uuid FROM uf_analysis
#                         WHERE submit_time IS NOT NULL
#                         OR start_time > (NOW() - :max_min * interval '1 minute'))
#                     )
#                     ORDER BY message_uuid LIMIT 1
#                 ON CONFLICT (message_uuid) DO UPDATE SET start_time=NOW(),analyst_email=:email
#                 RETURNING message_uuid"""

#     resp = connection.run(
#         command,
#         email=user_email,
#         program=program,
#         deployment_number=deployment_number,
#         language=language,
#         min_sec=MINIMUM_SECONDS_FILTER,
#         max_min=MAXIMUM_MINUTES_CHECKOUT,
#     )
#     return resp


# def get_uuid_metadata(connection, uuid):
#     audioMetadata = {}
#     command = """SELECT title,region,district,communityname,groupname,listening_model
#                     FROM uf_messages m
#                     JOIN recipients r
#                     ON m.recipientid = r.recipientid
#                     LEFT JOIN contentmetadata2 c
#                     ON m.relation = c.contentid
#                     WHERE message_uuid = :uuid"""

#     sqlmeta = connection.run(command, uuid=uuid)[0]
#     audioMetadata.update({"title": sqlmeta[0]})
#     audioMetadata.update({"region": sqlmeta[1]})
#     audioMetadata.update({"district": sqlmeta[2]})
#     audioMetadata.update({"community": sqlmeta[3]})
#     audioMetadata.update({"group": sqlmeta[4]})
#     audioMetadata.update({"listening_model": sqlmeta[5]})
#     return audioMetadata


# def num_from_array(array):
#     if len(array) == 0:  # empty array = 0
#         return 0
#     elif len(array) == 1:  # filtered array value is element 3
#         return array[0][3]
#     else:  # if len>1 then add up all values of the 3rd element (needed for not_analyzed)
#         return reduce(lambda y, sum: sum + y, map(lambda x: x[3], array))


# def get_progress(connection, user_email, program, deployment_number, language):
#     progress = {}
#     command = """SELECT (submit_time IS NULL), (analyst_email=:user), is_useless, count(*)
#                     FROM uf_messages m
#                     LEFT JOIN uf_analysis a
#                     ON a.message_uuid=m.message_uuid
#                     WHERE m.programid=:program AND deploymentnumber=:deployment_number AND language=:language
#                     AND length_seconds >= :min_length
#                     GROUP BY (submit_time IS NULL),(analyst_email=:user),is_useless
#                     ORDER BY (submit_time IS NULL),(analyst_email=:user),is_useless"""
#     sqlprogress = connection.run(
#         command,
#         user=user_email,
#         program=program,
#         deployment_number=deployment_number,
#         language=language,
#         min_length=MINIMUM_SECONDS_FILTER,
#     )
#     other_feedback = num_from_array(
#         list(filter(lambda r: r[1] == False and r[2] == False, sqlprogress))
#     )
#     other_useless = num_from_array(
#         list(filter(lambda r: r[1] == False and r[2] == True, sqlprogress))
#     )
#     user_feedback = num_from_array(
#         list(filter(lambda r: r[1] == True and r[2] == False, sqlprogress))
#     )
#     user_useless = num_from_array(
#         list(filter(lambda r: r[1] == True and r[2] == True, sqlprogress))
#     )
#     not_analyzed = num_from_array(list(filter(lambda r: r[0] == True, sqlprogress)))

#     user_recordings = user_feedback + user_useless
#     other_recordings = other_feedback + other_useless
#     all_recordings = user_recordings + other_recordings + not_analyzed

#     progress.update({"others_feedback": other_feedback})
#     progress.update({"others_recordings": other_recordings})
#     progress.update({"users_feedback": user_feedback})
#     progress.update({"users_recordings": user_recordings})
#     progress.update({"totalReceivedMessages": all_recordings})
#     return progress


# def get_uf_data(
#     connection, user_email, program, deployment_number, language, uuid, skip
# ):
#     all_data = {"audioMetadata": {}, "progress": {}}
#     url = ""  # empty string means no more messages available to process
#     if skip or uuid is None:
#         sqlResponse = get_next_uuid(
#             connection, user_email, program, deployment_number, language, skip
#         )
#         if len(sqlResponse) > 0:
#             uuid = sqlResponse[0][0]
#     else:
#         all_data["audioMetadata"].update(
#             {"submission": get_submission(connection, uuid)}
#         )
#     # check if there are any uf_messages to process for this program/deployment/language
#     if uuid is not None:
#         metadata = get_uuid_metadata(connection, uuid)
#         metadata.update({"uuid": uuid})
#         all_data["audioMetadata"].update(metadata)
#         # form the URL
#         url = (
#             "https://amplio-uf.s3.us-west-2.amazonaws.com/collected/"
#             + program
#             + "/"
#             + deployment_number
#         )
#         url += "/" + uuid + ".mp3"
#     all_data["audioMetadata"].update(
#         {"url": url}
#     )  # empty string url means no more messages to process
#     progress = get_progress(
#         connection, user_email, program, deployment_number, language
#     )
#     all_data["progress"].update(progress)

#     connection.close
#     return all_data


# @router.post("")
# @router.get("")
# @router.delete("")
# @router.put("")
# def lambda_handler(request: Request, body: Optional[Dict[Any, Any]] = None):
#     params = request.query_params

#     start = time.time_ns()
#     uuid = None
#     deployment = None
#     language = None
#     skip = False

#     # Parse out query string params
#     email = params.get("email", "").lower()
#     program = params.get("program")
#     if "deployment" in params:
#         deployment = str(params["deployment"])
#     if "language" in params:
#         language = params["language"]
#     if "uuid" in params:
#         uuid = params["uuid"]
#     # if "timezoneOffset" in params:
#     #     timezoneOffset = params["timezoneOffset"]
#     if "skip" in params:
#         skip = True

#     connection: Connection = get_db_connection()

#     # Get body of response object, depending on type of request
#     if uuid == "all":
#         result = get_submissions_list(
#             connection, program, deployment, language, email, params["timezoneOffset"]
#         )
#     elif program == "all":
#         result = get_program_list(connection, email)
#     else:
#         result = get_uf_data(
#             connection, email, program, deployment, language, uuid, skip
#         )

#     # Return the response object
#     return ApiResponse(data=json.dumps([result], default=str))


# if __name__ == "__main__":

#     def test_main():
#         submit_event1a = {
#             "queryStringParameters": {
#                 "email": "Abdu.Yimam@care.org",
#                 "program": "CARE-ETH-BOYS",
#                 "deployment": 1,
#                 "language": "aar",
#             }
#         }
#         submit_event1b = {
#             "queryStringParameters": {
#                 "email": "cliff@amplio.org",
#                 "program": "DEMO",
#                 "deployment": 1,
#                 "language": "en",
#             }
#         }
#         submit_event1c = {
#             "queryStringParameters": {
#                 "email": "cliff@cliffschmidt.com",
#                 "program": "DEMO",
#                 "deployment": 1,
#                 "language": "en",
#             }
#         }
#         submit_event1d = {
#             "queryStringParameters": {
#                 "email": "clifftest@test.com",
#                 "program": "DEMO",
#                 "deployment": 1,
#                 "language": "en",
#             }
#         }
#         submit_event2 = {
#             "queryStringParameters": {
#                 "email": "cliff@amplio.org",
#                 "program": "CARE-ETH-GIRLS",
#                 "deployment": 1,
#                 "language": "aar",
#                 "uuid": "9c06d847-1baa-5bbe-829d-c3a24bdc827e",
#             }
#         }
#         submit_event3 = {
#             "queryStringParameters": {
#                 "email": "Abdu.Yimam@care.org",
#                 "program": "CARE-ETH-BOYS",
#                 "deployment": 1,
#                 "language": "aar",
#                 "uuid": "all",
#                 "timezoneOffset": "-420 minutes",
#             }
#         }
#         submit_event3b = {
#             "queryStringParameters": {
#                 "email": "cliff@amplio.org",
#                 "program": "CARE-ETH-BOYS",
#                 "deployment": 1,
#                 "language": "aar",
#                 "uuid": "all",
#                 "timezoneOffset": "-420 minutes",
#             }
#         }
#         submit_event4a = {
#             "queryStringParameters": {"email": "Abdu.Yimam@care.org", "program": "all"}
#         }
#         submit_event4b = {
#             "queryStringParameters": {"email": "cliff@amplio.org", "program": "all"}
#         }
#         submit_event4c = {
#             "queryStringParameters": {
#                 "email": "mavis.banda@vsoint.org",
#                 "program": "all",
#             }
#         }
#         submit_event4d = {
#             "queryStringParameters": {
#                 "email": "CLIFF@cliffschmidt.com",
#                 "program": "all",
#             }
#         }
#         submit_event4e = {
#             "queryStringParameters": {
#                 "email": "amplio.demo@gmail.com",
#                 "program": "all",
#             }
#         }
#         print(lambda_handler(submit_event1b, None))
#         print(lambda_handler(submit_event1c, None))
#         print(lambda_handler(submit_event1d, None))

#     test_main()
