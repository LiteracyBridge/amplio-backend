#!/usr/bin/sh

import argparse
import shutil
import subprocess
import sys
from os.path import expanduser
from pathlib import Path
from typing import Optional

from boto3 import client
from dynamoUtils import (
    check_for_checkout,
    check_for_organization_record,
    check_for_program_record,
    create_checkout_record,
    create_organization_record,
    create_program_record,
)
from sqlUtils import check_for_postgresql_project, populate_postgresql
from utils import canonical_acm_path_name, canonical_acm_project_name

from config import PROGRAM_CONTENT_BUCKET, PROGRAM_SPEC_BUCKET

# s3 and projspec, dashboard buckets
s3_client = client("s3")
projspec_bucket: str = PROGRAM_SPEC_BUCKET
content_bucket: str = PROGRAM_CONTENT_BUCKET

# Properties of the two dropbox users: a maintaining user and the processing user.

args = {}

# Get the user name and password that we need to sign into the SQL database. Configured through AWS console.


# Make a connection to the SQL database


# List the objects with the given prefix.
# noinspection PyPep8Naming
def _list_objects(Bucket, Prefix="", **kwargs):
    paginator = s3_client.get_paginator("list_objects_v2")
    kwargs = {"Bucket": Bucket, "Prefix": Prefix, **kwargs}
    for objects in paginator.paginate(**kwargs):
        for obj in objects.get("Contents", []):
            yield obj


def fetch_template_progspec() -> bytes:
    """
    Download the template program specification to the desired file.
    :return:
    """
    import urllib.request

    url = (
        "https://s3-us-west-2.amazonaws.com/dashboard-lb-stats/"
        + "ProgramSpecificationTemplate/Template-ProgramSpecification.xlsx"
    )
    # Download the file from `url` and save it locally under `file_name`:
    with urllib.request.urlopen(url) as response:
        data = response.read()  # a `bytes` object
        return data


def write_template_progspec(dest_path: Path | str = "~/template.xlsx"):
    """
    Download the template program specification to the desired file.
    :param dest_path: to receive the program specification.
    :return:
    """
    file_name = expanduser(dest_path)
    # Download the file from `url` and save it locally under `file_name`:
    data = fetch_template_progspec()
    with open(file_name, "wb") as out_file:
        out_file.write(data)


def check_for_existing_s3_content(program_id: str) -> bool:
    """
    Checks to see if there is program content in S3 for the given acm.
    :param program_id: to be checked.
    :return: True if there is no existing program content, False if there is
    """
    print(f"Looking for program '{program_id}' content objects in s3...", end="")
    prefix = f"{program_id}/"
    paginator = s3_client.get_paginator("list_objects_v2")
    kwargs = {"Bucket": content_bucket, "Prefix": prefix}
    objs = []
    for objects in paginator.paginate(**kwargs):
        objs.extend(objects.get("Contents", []))
    if objs:
        print(f"\n  Found program content objects for '{program_id}'.")
        return False
    print("ok")
    return True


# def check_for_existing_content(program_id: str, acm_dir: str) -> bool:
#     return check_for_existing_s3_content(program_id)


def check_for_programspec(program_id) -> bool:
    """
    Checks to see if there is a program spec in S3 for the given acm.
    :param program_id: to be checked.
    :return: True if there is no existing program spec, False if there is one
    """
    print(f"Looking for program spec '{program_id}' objects in s3...", end="")
    prefix = f"{program_id}/"
    paginator = s3_client.get_paginator("list_objects_v2")
    kwargs = {"Bucket": projspec_bucket, "Prefix": prefix}
    objs = []
    for objects in paginator.paginate(**kwargs):
        objs.extend(objects.get("Contents", []))
    if objs:
        print("\n  Found program spec objects for {}".format(program_id))
        return False
    print("ok")
    return True


def create_and_populate_acm_directory(acm_dir):
    """
    Copies ACM-template as the new project.
    :param program_name: to be created
    :return: True
    """
    acm_path = canonical_acm_path_name(acm_dir)
    template_path = canonical_acm_path_name("template", upper=False)
    print(f"Creating and populating acm directory for {acm_dir}...", end="")

    try:
        shutil.copytree(template_path, acm_path)
        print("ok")
        return True
    except Exception as ex:
        print("exception copying template acm: {}".format(ex))
        return False


def create_and_populate_s3_object(program_id):
    """
    Copy content from ${content_bucket}/template to ${content_bucket}/${program_name}
    """
    print(f"Creating and populating s3 folder for {program_id}...", end="")
    try:
        for s3_obj in _list_objects(Bucket=content_bucket, Prefix="template/"):
            source_key = s3_obj["Key"]
            dest_key = program_id + source_key[8:]
            response = s3_client.copy(
                {"Bucket": content_bucket, "Key": source_key}, content_bucket, dest_key
            )
        print("ok")
        return True
    except Exception as ex:
        print(f"Exception copying template acm: {ex}")
        return False


def create_and_populate_content(program_id: str) -> bool:
    return create_and_populate_s3_object(program_id)


def initialize_programspec(program_id: str, is_s3: bool) -> bool:
    """
    Downloads the program spec template to the projspec directory. Names it as
    PROJECT-programspec.xlsx to avoid conflicts with the real new program spec.
    Opens the file in Excel to be edited
    :param program_id: to get the program spec
    :return: True
    """
    print(f"Creating program spec for {program_id}...", end="")
    if is_s3:
        # Copy the template program spec .xlsx file to the s3 progspec bucket.
        from_key = "template/pub_progspec.xlsx"
        to_key = f"{program_id}/pub_progspec.xlsx"
        print(f"copying program spec to 's3://{projspec_bucket}/{to_key}'...", end="")
        kwargs = {
            "Bucket": projspec_bucket,
            "Key": to_key,
            "CopySource": {"Bucket": projspec_bucket, "Key": from_key},
        }
        copy_result = s3_client.copy_object(**kwargs)
        if copy_result.get("ResponseMetadata", {}).get("HTTPStatusCode", 0) == 200:
            print(
                "ok\n  -- Download the spec and edit it, or use the Amplio Suite to edit the program spec."
            )
            return True
    else:
        # Copy the template program spec .xlsx file to the programspec directory in Dropbox.
        acm_path = canonical_acm_path_name(program_id)
        progspec_dir = Path(acm_path, "programspec")
        progspec_dir.mkdir(parents=True, exist_ok=True)
        progspec = Path(progspec_dir, f"{program_id}-programspec.xlsx")

        write_template_progspec(progspec)

        print("opening program spec...", end="")
        subprocess.run(["open", str(progspec)], check=True)
        print(
            f"ok\n  -- Edit the spec and use the Dashboard to submit for {program_id}"
        )
        return True
    return False


# noinspection PyUnresolvedReferences
def new_acm():
    global args

    ok = True
    acm = args.acm
    program_id = str(canonical_acm_project_name(acm))
    acm_dir = program_id

    if args.do_content != "none":
        ok = check_for_existing_s3_content(program_id=program_id) and ok

    if args.do_checkout != "none":
        ok = check_for_checkout(acm_dir) and ok

    if args.do_program != "none":
        ok = check_for_program_record(program_id) and ok

    if args.do_organization != "none":
        ok = check_for_organization_record(args.org, args.parent) and ok

    if args.do_progspec != "none":
        ok = check_for_programspec(program_id) and ok

    if args.do_sql != "none":
        ok = check_for_postgresql_project(program_id) and ok
    print(ok)

    if ok and not args.dry_run:
        print(f"\nCreating entries for {program_id}.\n")

        if args.do_content == "both":
            ok = create_and_populate_content(program_id, acm_dir) and ok

        if args.do_checkout == "both":
            ok = create_checkout_record(acm_dir) and ok
        if args.do_program == "both":
            ok = create_program_record(
                program_id, args.org, args.admin, args.s3, args.name
            )

        if args.do_organization == "both":
            ok = create_organization_record(args.org, args.parent)

        if args.do_progspec == "both":
            ok = initialize_programspec(program_id, args.s3) and ok
        if args.do_sql == "both":
            ok = populate_postgresql(program_id, args.name) and ok

        if not ok:
            print(f"Errors encountered creating or sharing acm {program_id}")
    else:
        if not ok:
            print("Issues detected; ", end="")
        if args.dry_run:
            print("Dry run; ", end="")
        print("no action attempted.")

    return ok


def main():
    global args

    arg_parser = argparse.ArgumentParser(fromfile_prefix_chars="@")
    arg_parser.add_argument("acm", help="The new ACM name")
    arg_parser.add_argument(
        "--s3",
        action="store_true",
        help="The program's content storage is in S3, not Drobpox.",
    )
    arg_parser.add_argument(
        "--name", required=True, help="what the customer calls the program."
    )
    arg_parser.add_argument(
        "--org",
        "--customer",
        metavar="customer",
        help="The customer running or sponsoring the program.",
    )
    arg_parser.add_argument(
        "--parent",
        "--affiliate",
        help="The program's organization's parent.",
        default="Amplio",
    )
    arg_parser.add_argument(
        "--admin", help="Email address of the program administrator."
    )
    arg_parser.add_argument(
        "--dry-run",
        "--dryrun",
        "-n",
        action="store_true",
        help="Don't update anything.",
    )

    arg_parser.add_argument(
        "--do-content",
        "--do-acm",
        choices=["none", "check", "both"],
        default="both",
        help="Do or don't create ACM directory.",
    )
    arg_parser.add_argument(
        "--do-sql",
        choices=["none", "check", "both"],
        default="both",
        help="Do or don't check or update projects table in PostgreSQL.",
    )
    arg_parser.add_argument(
        "--do-checkout",
        choices=["none", "check", "both"],
        default="both",
        help="Do or don't create a checkout record.",
    )
    arg_parser.add_argument(
        "--do-progspec",
        choices=["none", "check", "both"],
        default="both",
        help="Do or don't check or create program specification.",
    )
    arg_parser.add_argument(
        "--do-program",
        choices=["none", "check", "both"],
        default="both",
        help="Do or don't check or create a program record.",
    )
    arg_parser.add_argument(
        "--do-organization",
        choices=["none", "check", "both"],
        default="both",
        help="Do or don't check or create an organization record.",
    )

    args = arg_parser.parse_args()
    new_acm()


if __name__ == "__main__":
    sys.exit(main())
