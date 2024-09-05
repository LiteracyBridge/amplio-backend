import argparse
import csv
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

from sqlalchemy import select

from config import STATISTICS_BUCKET, config
from database import get_db
from models.recipient_model import Recipient
from scripts.acm_stats.import_stats import (
    ACM_DIR,
    BIN,
    CORE_DIR,
    PROCESSED_DATA_DIR,
    S3_IMPORT,
    S3_STATS_BUCKET,
    S3_USER_FEEDBACK,
    STATS_ROOT,
    extract_tbloader_artifacts,
    gather_files,
    get_recipient_map,
    import_alt_statistics,
    import_deployments,
)
from utilities.aws_ses import send_mail

gatheredAny = False
needcss = True

# cmd args
verbose = True
execute = True

UPLOAD_TO_S3: bool = False
FROM_ARCHIVE: bool = False
SKIP: int = 0
SKIPPED: int = 0
PROCESSED: int = 0
RE_IMPORT_USER_FEEDBACK: bool = False
RE_IMPORT_DEPLOYMENT: bool = False
RE_IMPORT_STATS: bool = False


def import_user_feedback(dailyDir):
    """Import user feedback to ACM-{project}-FB-{update}"""

    recordings_dir = os.path.join(dailyDir, "userrecordings")

    print(
        "-------- importUserFeedback: Importing user feedback audio to s3, metadata to database. --------"
    )
    print("Checking for user feedback recordings")

    # Check if recordings_dir is a directory
    if os.path.isdir(recordings_dir):
        print(
            "Export user feedback from",
            recordings_dir,
            "and upload to",
            S3_USER_FEEDBACK,
        )

        # Create a temporary directory
        tmpname = subprocess.run(
            ["mktemp", "-d"], capture_output=True, text=True
        ).stdout.strip()
        tmpdir = f"~/importUserFeedback{tmpname}"
        os.makedirs(os.path.expanduser(tmpdir))
        print("uf temp:", tmpdir)

        # Run the Python script
        subprocess.run(
            [
                "just",
                "uf-utility",
                "-vv",
                "extract_uf",
                recordings_dir,
                "--out",
                tmpdir,
            ]
        )

        # Upload files to S3
        subprocess.run(["aws", "s3", "mv", "--recursive", tmpdir, S3_USER_FEEDBACK])

        # List files in the tmpdir directory
        subprocess.run(["find", tmpdir])

        # Remove files and directory
        subprocess.run(["rm", "-rf", tmpdir, "*"])
        subprocess.run(["rmdir", "-p", "--ignore-fail-on-non-empty", tmpdir])
    else:
        print("No directory", recordings_dir)


# Import statistics to PostgreSQL database.
def import_statistics(daily_dir: str):
    global SKIP, PROCESSED

    # These -D settings are needed to turn down the otherwise overwhelming hibernate logging.
    quiet1 = "-Dorg.jboss.logging.provider=slf4j"
    quiet2 = "-Djava.util.logging.config.file=simplelogger.properties"

    # iterate the timestamp directories.
    for statdir in os.listdir(daily_dir):
        # only process if .zip files; user recordings don't have .zip files (fortunately).
        zipcount = len(
            [
                name
                for name in os.listdir(os.path.join(daily_dir, statdir))
                if name.endswith(".zip")
            ]
        )

        if zipcount != 0:
            if SKIPPED < SKIP:
                SKIPPED += 1
                continue

            verbose and print(f"Import from {statdir}.")

            # Make the commands, so that they can be displayed and/or executed
            import_cmd = f'time java {quiet1} {quiet2} -jar {core} -f {sqloption} -z "{os.path.join(daily_dir, statdir)}" -d "{os.path.join(daily_dir, statdir)}" -r "{REPORT_FILE}"'

            verbose and print(import_cmd)
            execute and os.system(import_cmd)

            PROCESSED += 1
            if PROCESSED >= limit:
                break
        elif os.path.isdir(statdir):
            verbose and print(f"No zips in {statdir}")

    import_alt_statistics(daily_dir)


def process_day(year, month, day):
    daily_dir = f"{PROCESSED_DATA_DIR}/{year}/{month}/{day}"

    print("Re-gather from s3")
    print(
        "-------- gatherFiles: Re-gathering the collected data from archived-data --------"
    )

    if FROM_ARCHIVE:
        gather_files(
            daily_dir=f"{PROCESSED_DATA_DIR}/{year}/{month}/{day}",
            timestamp=f"{year}y{month}m{day}d{datetime.now(timezone.utc).strftime('%H')}h{datetime.now(timezone.utc).strftime('%M')}m{datetime.now(timezone.utc).strftime('%S')}s",
            s3_import=f"${S3_STATS_BUCKET}/archived-data/{year}/{month}/{day}/",
            re_import=True,
            s3_archive=None,
        )
    elif not os.path.isdir(daily_dir):
        print(f"{daily_dir} does not exist")
        sys.exit(1)

    verbose and print(f"Processing {year}-{month}-{day}")

    get_recipient_map(daily_dir)

    if RE_IMPORT_USER_FEEDBACK:
        import_user_feedback(daily_dir)
    if RE_IMPORT_STATS:
        import_statistics(daily_dir)
    if RE_IMPORT_DEPLOYMENT:
        import_deployments(daily_dir)

    if UPLOAD_TO_S3:
        s3_daily_dir = f"{s3bucket}/processed-data/{year}/{month}/{day}"
        print(f"aws s3 sync {daily_dir} {s3_daily_dir}")
        subprocess.run(["aws", "s3", "sync", daily_dir, s3_daily_dir])


def process_month(year, month):
    month_dir = f"{PROCESSED_DATA_DIR}/{year}/{month}"
    if not os.path.isdir(month_dir):
        print(f"{month_dir} does not exist")
        exit(1)

    verbose and print(f"Processing {year}-{month}")

    for day in os.listdir(month_dir):
        if os.path.isdir(f"{month_dir}/{day}"):
            process_day(year=year, month=month, day=day)
            if PROCESSED >= limit:
                sys.exit(1)


def process_year(year):
    year_dir = f"{PROCESSED_DATA_DIR}/{year}"
    if not os.path.isdir(year_dir):
        print(f"{year_dir} does not exist")
        sys.exit(1)

    verbose and print(f"Processing {year}")

    for month in os.listdir(year_dir):
        if os.path.isdir(f"{year_dir}/{month}"):
            process_month(year=year, month=month)
            if PROCESSED >= limit:
                sys.exit(1)


def processYear(year):
    yearDir = f"{processed_data}/{year}"
    if not os.path.isdir(yearDir):
        print(f"{yearDir} does not exist")
        exit(1)

    verbose and print(f"Processing {year}")

    for month in os.listdir(yearDir):
        if os.path.isdir(f"{yearDir}/{month}"):
            processMonth(year, month)
            if PROCESSED >= limit:
                exit(1)


if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(
        description="Re-import statistics from S3 into the database."
    )
    arg_parser.add_argument(
        "-y",
        "--year",
        action="year",
        default=datetime.now().year,
        help="yyyy\tImport Year, default current year",
    )
    arg_parser.add_argument(
        "-m",
        "--month",
        action="month",
        default="",
        help="mm\tImport Month, default all months",
    )
    arg_parser.add_argument(
        "-d",
        "--day",
        action="day",
        default="",
        help="dd\tImport Day, default all days, requires --month",
    )
    arg_parser.add_argument(
        "-a",
        "--archived",
        action="from_archive",
        help="Re-import from archived-data, not processed-data. OVERWRITES processed-data. Be sure.",
    )
    arg_parser.add_argument(
        "-c",
        "--no-update",
        action="upload_to_s3",
        help="Do NOT update s3://acm-stats/processed-data/yyyy/mm/dd/...",
    )
    arg_parser.add_argument(
        "-u",
        "--re-import-uf",
        action="re_import_uf",
        help="Re-import User feedback",
    )
    arg_parser.add_argument(
        "-p",
        "--pr",
        "--project",
        action="project",
        help="When importing UF, limit to project pr.",
    )
    arg_parser.add_argument(
        "-s",
        "--re-import-stats",
        action="re_import_stats",
        help="Re-import Statistics. If both user feedback and statistics, user feedback is first.",
    )
    arg_parser.add_argument(
        "-z",
        "--update-db",
        action="update_db",
        help="When importing Statistics, do not perform database writes.",
    )
    arg_parser.add_argument(
        "-i",
        "--re-import-deployment",
        action="re_import_deployment",
        help="Reimport Deployment Deployments. Runs after UF or Stats.",
    )
    arg_parser.add_argument(
        "-e",
        "--no-email",
        action="no_email",
        help="Do not send email notification",
    )

    arg_parser.add_argument(
        "--dry-run",
        "--dryrun",
        "-n",
        action="dry_run",
        help="Dry run, do not update (abort transaction at end).",
    )
    arg_parser.add_argument(
        "-v",
        "--verbose",
        action="verbose",
        help="Verbose output",
    )
    arg_parser.add_argument(
        "-l",
        "--limit",
        type=int,
        default=99999,
        action="limit",
        help="Limit to n directories imported",
    )
    arg_parser.add_argument(
        "-k",
        "--skip",
        type=int,
        default=0,
        action="skip",
        help="Skip first m directories. Note that -l and -k apply to BOTH statistics and user feedback combined.",
    )

    arglist = None
    args = arg_parser.parse_args(arglist)

    if not args.verbose:
        verbose = False
    if args.dry_run:
        execute = False
        print("Dry run -- nothing will be imported")

    print(f"Limiting UF ufProject to {args.project}")

    if not args.re_import_stats and args.re_import_deployment and args.re_import_uf:
        print("No function specified, exiting...")
        sys.exit(1)

    if args.day != "" and args.month == "":
        print("Specifying day requires month as well.")
        sys.exit(1)

    FROM_ARCHIVE = args.from_archive
    RE_IMPORT_DEPLOYMENT = args.re_import_deployment
    RE_IMPORT_USER_FEEDBACK = args.re_import_uf
    UPLOAD_TO_S3 = args.upload_to_s3

    if args.day != "":
        process_day(year=args.year, month=args.month, day=args.day)
    elif args.month != "":
        process_month(year=args.year, month=args.month)
    else:
        process_year(year=args.year)
