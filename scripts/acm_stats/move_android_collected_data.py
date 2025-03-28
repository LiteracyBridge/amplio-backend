#!/usr/bin/sh

"""
Moves stats data by the Android TB Loader from s3:::amplio-program-content/staging-android-collected-data to s3:::acm-stats/collected-data directory

This trigger is invoked by the s3 event notification when the Android TB Loader writes the data to 'staging-android-collected-data' directory.

Refer to https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html on how to
handle s3 events & event data structure.
"""

import argparse

from boto3 import client

from config import COLLECTED_STATS_BUCKET, PROGRAM_CONTENT_BUCKET, config
from utilities.aws_ses import send_email


def move_files():
    config.init_sentry()

    s3 = client("s3")
    paginator = s3.get_paginator("list_objects_v2")

    # List objects within a bucket and a specific prefix
    source_prefix = "staging-android-collected-data/"
    target_prefix = "collected-data.v2/"
    page_iterator = paginator.paginate(
        Bucket=PROGRAM_CONTENT_BUCKET, Prefix=source_prefix
    )
    count = 0

    for page in page_iterator:
        if "Contents" in page:
            for obj in page["Contents"]:
                source_key = obj["Key"]
                target_key = source_key.replace(source_prefix, target_prefix, 1)

                # Copy object to the new bucket
                copy_source = {"Bucket": PROGRAM_CONTENT_BUCKET, "Key": source_key}
                s3.copy(copy_source, COLLECTED_STATS_BUCKET, target_key)

                # Delete the original object
                s3.delete_object(Bucket=PROGRAM_CONTENT_BUCKET, Key=source_key)

                print(f"Moved {source_key} to {COLLECTED_STATS_BUCKET}/{target_key}")
                count += 1

    if count > 0:
        print(
            f"Moved {count} files from {PROGRAM_CONTENT_BUCKET}/{source_prefix} to {COLLECTED_STATS_BUCKET}/{target_prefix}"
        )

        subject = "Android Collected Data Moved"
        body = config.jinja("emails/android_collected_data_moved.html").render(
            count=count, subject=subject
        )
        send_email(subject, body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Move files between S3 buckets")
    args = parser.parse_args()

    move_files()
