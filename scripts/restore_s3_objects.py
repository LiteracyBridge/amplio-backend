"""
Restore deleted S3 objects
Params:
    bucket-name
    folder/object name
"""

import argparse
import csv
import json
import subprocess
import sys


def restore_objects(bucket: str, object_key: str):
    print("Loading object versions from S3 ......", end="")
    output = subprocess.run(
        [
            "aws",
            "s3api",
            "list-object-versions",
            "--bucket",
            bucket,
            "--prefix",
            object_key,
        ],
        capture_output=True,
        text=True,
    ).stdout
    print("ok")

    print("Removing delete markers from the S3 bucket....")

    versions_json = json.loads(output)
    for marker in versions_json["DeleteMarkers"]:
        print(f"  restoring {marker['Key']}....", end="\t")
        cmd = [
            "aws",
            "s3api",
            "delete-object",
            "--bucket",
            bucket,
            "--key",
            marker["Key"],
            "--version-id",
            marker["VersionId"],
        ]
        subprocess.run(cmd)

    print("Object(s) restored successfully!")
    print("")
    cmd = ["aws", "s3", "ls", f"s3://{bucket}/{object_key}"]
    output = subprocess.run(cmd, capture_output=True, text=True).stdout
    print(output)


if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(
        description="Exports custom survey of a project into excel file"
    )
    arg_parser.add_argument(
        "--bucket",
        help="Bucket Name.  eg. DOC-EXAMPLE-BUCKET",
        dest="bucket",
        nargs="*",
        required=True,
    )
    arg_parser.add_argument(
        "--object-key",
        help="Name of the folder/file to restore. eg. examplefolder/",
        dest="object_key",
        nargs="*",
        required=True,
    )

    args = arg_parser.parse_args()
    if args.bucket is None or args.object_key is None:
        arg_parser.print_help()
        sys.exit(0)

    sys.exit(restore_objects(bucket=args.bucket[0], object_key=args.object_key[0]))
