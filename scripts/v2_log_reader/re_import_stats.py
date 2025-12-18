import argparse
from datetime import datetime

from config import STATISTICS_BUCKET
from scripts.v2_log_reader.S3Data import S3Driver
from scripts.v2_log_reader.S3Data.S3Importer import ARCHIVE_PREFIX


def run(args: argparse.Namespace):
    day: str = f"{args.day:02d}"
    year: str = args.year
    month: str = args.month

    s3_key = f"/{ARCHIVE_PREFIX}/{year}/{month}/{day}"

    args.source_bucket = STATISTICS_BUCKET
    args.no_archive = True
    args.upsert = True
    s3_driver = S3Driver(prefix=s3_key, args=args)
    if s3_driver.find_objects():
        s3_driver.process_objects()


if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(
        description="Re-import v2 statistics from S3 into the database."
    )
    arg_parser.add_argument(
        "--year",
        "-y",
        action="store",
        default=datetime.now().year,
        type=int,
        help="yyyy\tImport Year, default current year",
    )
    arg_parser.add_argument(
        "--month",
        "-m",
        action="store",
        default=datetime.now().month,
        type=int,
        help="mm\tImport Month, default current month",
    )
    arg_parser.add_argument(
        "--day",
        "-d",
        action="store",
        default=datetime.now().day,
        type=int,
        help="dd\tImport Day, default current day",
    )
    arg_parser.add_argument(
        "--project",
        "-p",
        action="store",
        required=True,
        type=str,
        help="Project code. eg. SSA-ETH",
    )
    arg_parser.add_argument(
        "--deployment",
        "-dp",
        action="store",
        required=True,
        type=str,
        help="Deployment to re-import. eg. SSA-ETH-25-1",
    )
    arg_parser.add_argument(
        "--tbloader-id",
        "-tb",
        action="store",
        required=False,
        type=str,
        help="Re-import stats collected by this TB-Loader. eg. 00be",
    )
    arg_parser.add_argument(
        "--verbose",
        "-v",
        action="store",
        required=False,
        default=False,
        type=bool,
    )

    arglist = None
    args = arg_parser.parse_args(arglist)

    run(args)
