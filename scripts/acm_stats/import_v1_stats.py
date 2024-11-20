import csv
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import text

from config import STATISTICS_BUCKET, config
from database import get_db
from utilities.aws_ses import send_email

STATS_ROOT = config.statistics_data_dir
SCRIPT_DIR = Path(__file__).resolve().parent
BIN = os.path.join(SCRIPT_DIR, "AWS-LB", "bin")
CORE_DIR = os.path.join(BIN, "core-with-deps.jar")
ACM_DIR = os.path.join(BIN, "acm")
PROCESSED_DATA_DIR = os.path.join(STATS_ROOT, "processed-data")
REPORT_FILE = ""  # path to file set in main

IMPORT_STATS_DIR = f"{SCRIPT_DIR}/AWS-LB/importStats"
STATS_CSS = f"{IMPORT_STATS_DIR}/importStats.css"

S3_STATS_BUCKET = f"s3://{STATISTICS_BUCKET}"
S3_IMPORT = f"{S3_STATS_BUCKET}/collected-data"
S3_USER_FEEDBACK = "s3://amplio-uf/collected"
LOGS_DIR = os.path.join(STATS_ROOT, "logs")


gatheredAny = False
needcss = True
verbose = True
execute = True

db = next(get_db())


def find_zips(directory):
    zips = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".zip"):
                zips.append(os.path.join(root, file))
    return zips


def gather_files(
    daily_dir: str,
    timestamp: str,
    s3_archive: Optional[str],
    s3_import: str = S3_IMPORT,
    re_import: bool = False,
):
    global gatheredAny

    print("-------- gatherFiles: Gathering the collected data from s3 --------")
    print("Gather from s3")

    tmpdir = tempfile.mkdtemp()
    print(f"temp: {tmpdir}, {timestamp}")

    # pull files from s3
    subprocess.run(
        ["aws", "s3", "sync", s3_import, tmpdir],
        stdout=open(f"{LOGS_DIR}/reports3.raw", "w"),
        check=True,
    )

    # process into collected-data
    print("Process into collected-data")
    results = subprocess.run(
        f"java -cp \"{os.path.abspath(ACM_DIR)}/acm.jar:{os.path.abspath(ACM_DIR)}/lib/*\" org.literacybridge.acm.utils.MoveStats -b {os.path.join(SCRIPT_DIR, 'blacklist.txt')} {tmpdir} {os.path.abspath(daily_dir)} {timestamp}",
        # check=True,
        stdout=open(LOGS_DIR + "/err.log", "w"),
        stderr=open(LOGS_DIR + "/err.log", "w"),
        shell=True,
    )

    if results.returncode == 0:
        gatheredAny = True
        if os.path.exists("acm.log") and os.path.getsize("acm.log") > 0:
            os.rename("acm.log", f"{daily_dir}/moves3.log")
    else:
        gatheredAny = False
        print("MoveStats failed")
        print(results)

    # move s3 files from import to archive "folder".
    raw_report = f"{LOGS_DIR}/reports3.raw"
    if not re_import:
        # save a list of the zip file names. They'll be deleted locally, so get the list now. We'll use
        # the list later, to move the files in s3 to an archival location.
        statslist = find_zips(tmpdir)

        print("Archive s3 objects")
        for statfile in statslist:
            with open(raw_report, "a") as f:
                subprocess.run(
                    [
                        "aws",
                        "s3",
                        "mv",
                        f"{s3_import}/{statfile}",
                        f"{s3_archive}/{statfile}",
                        "--verbose",
                    ],
                    stdout=f,
                )

    # clean up the s3 output, and produce a formatted HTML report.
    reports3_filtered = f"{LOGS_DIR}/reports3.filtered"
    subprocess.run(
        f"cat {raw_report} | tr '\r' '\n' | sed '/^Completed.*remaining/d' > {reports3_filtered}",
        # stdout=f,
        shell=True,
    )

    html_report = f"{LOGS_DIR}/rpt.html"
    if os.path.exists(reports3_filtered) and os.path.getsize(reports3_filtered) > 0:
        shutil.copy(reports3_filtered, f"{daily_dir}/s3.log")

        # Create an HTML section for S3 imports
        with open(html_report, "a") as f:
            f.write("<div class='s3import'><h2>S3 Imports</h2></div>\n")

        # Iterate over lines in reports3.filtered and write them to HTML
        with open(html_report, "a") as f2:
            with open(reports3_filtered, "r") as f:
                for line in f:
                    f2.write(f"<p>{line}</p>\n")
            f2.write("</div>\n")

        with open(REPORT_FILE, "a") as f:
            subprocess.run(["cat", html_report], stdout=f)

    subprocess.run(["cat", raw_report], stdout=subprocess.PIPE)
    if os.path.getsize(reports3_filtered) > 0:
        subprocess.run(["cat", html_report], stdout=subprocess.PIPE)

    # Remove the temporary directory
    # os.rmdir(tmpdir)


def import_user_feedback(dailyDir):
    """Import user feedback to ACM-{project}-FB-{update}"""

    recordings_dir = os.path.join(dailyDir, "userrecordings")
    os.makedirs(recordings_dir, exist_ok=True)

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
        tmpdir = tempfile.mkdtemp(f"importUserFeedback")
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
        subprocess.run(["rm", "--recursive", "--force", tmpdir, "*"])
        if os.path.exists(tmpdir):
            subprocess.run(["rmdir", "--parents", "--ignore-fail-on-non-empty", tmpdir])
    else:
        print("No directory", recordings_dir)


def get_recipient_map(daily_dir, _report_file: Optional[str] = None):
    recipients_map_file = os.path.join(daily_dir, "recipients_map.csv")
    if _report_file is None and REPORT_FILE != "":
        _report_file = REPORT_FILE
    else:
        _report_file = os.path.join(daily_dir, "importStats.html")

    # Extract data from recipients_map table. Used to associate 'community' directory names to recipientid.
    db = next(get_db())
    results = db.execute(
        text("SELECT project, directory, recipientid FROM recipients_map")
    ).fetchall()

    with open(recipients_map_file, "w", newline="") as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(["project", "directory", "recipientid"])
        csv_writer.writerows(results)

    # Write HTML section to the report

    with open(_report_file, "a") as f:
        f.write('<div class="reportline">\n')
        with open(recipients_map_file, "r") as f2:
            for line in f2:
                f.write(f"<p>{line}</p>\n")
        f.write("</div>\n")


def import_statistics(daily_dir):
    print("Import user statistics to database.")

    # Append CSS file to report
    with open(REPORT_FILE, "a") as f:
        f.write(open(STATS_CSS, "r").read())

    print("-------- importStatistics: Importing 'playstatistics' to database. --------")
    print("<h2>Importing TB Statistics to database.</h2>", file=open(REPORT_FILE, "a"))

    # These -D settings are needed to turn down the otherwise overwhelming hibernate logging.
    quiet1 = "-Dorg.jboss.logging.provider=slf4j"
    quiet2 = "-Djava.util.logging.config.file=simplelogger.properties"

    # Iterate timestamp directories
    for statdir in os.listdir(daily_dir):
        statdir_path = os.path.join(daily_dir, statdir)
        if os.path.isdir(statdir_path):
            # Run import command
            # -f: force;  -z: process-zips-from-this-directory; -d put-logs-here; -r: append-report-here
            import_command = f"java {quiet1} {quiet2} -jar {CORE_DIR} -f -z {statdir_path} -d {statdir_path} -r {REPORT_FILE}"
            if verbose:
                print(import_command)

            if execute:
                subprocess.run(import_command, shell=True)

            # Move log file if exists
            if os.path.exists("dashboard_core.log"):
                os.rename(
                    "dashboard_core.log",
                    os.path.join(statdir_path, "dashboard_core.log"),
                )

    # Call another function
    import_alt_statistics(daily_dir)


def import_alt_statistics(daily_dir: str):
    recipients_map_file = os.path.join(daily_dir, "recipients_map.csv")
    temp_report = f"{REPORT_FILE}.tmp"

    # Get CSS (assuming getCss function is defined elsewhere)
    if verbose:
        print("Adding css to report.")

    if execute:
        with open(REPORT_FILE, "a") as f:
            f.write(open(STATS_CSS, "r").read())

    print(
        "-------- importAltStatistics: Importing playstatistics to database. --------"
    )
    print(
        "<h2>Importing Play Statistics to database.</h2>", file=open(REPORT_FILE, "a")
    )

    # Remove temporary file
    if os.path.exists(temp_report):
        os.remove(temp_report)

    playstatistics_csv = os.path.join(daily_dir, "playstatistics.csv")

    print("stats dir")
    print(playstatistics_csv)
    print(daily_dir)

    # Gather the playstatistics.kvp files from the daily directory
    playstatistics_files = subprocess.check_output(
        f"find {daily_dir} -iname playstatistics.kvp", shell=True, text=True
    ).splitlines()

    print("files-->>")
    print(playstatistics_files)
    print(temp_report)

    # Create extract command
    extract_command = [
        "just",
        "kv2csv",
        "--2pass",
        "--columns",
        f"@{os.path.join(IMPORT_STATS_DIR, 'columns.txt')}",
        "--map",
        recipients_map_file,
        "--output",
        playstatistics_csv,
    ] + playstatistics_files

    # Log and execute command
    if verbose:
        print(extract_command, file=open(temp_report, "a"))

    if execute:
        subprocess.run(extract_command, stdout=open(temp_report, "a"), text=True)

    # Import into db and update playstatistics
    with open(playstatistics_csv, "r") as file:
        csv_reader = csv.DictReader(file)
        headers = csv_reader.fieldnames

        # Build the SQL insert statement dynamically
        columns = ", ".join(headers)
        sql = f"INSERT INTO mstemp ({columns}) VALUES "
        for row in csv_reader:
            placeholders = ", ".join([f"'{row[k]}'" for k in headers])
            sql += f"({placeholders}),"

        sql = sql.removesuffix(",")

        query = f"""
            CREATE TEMPORARY TABLE mstemp AS SELECT * FROM playstatistics WHERE false;

            {sql};

            DELETE FROM playstatistics d USING mstemp t WHERE d.timestamp=t.timestamp
            AND d.tbcdid=t.tbcdid AND d.project=t.project AND d.deployment=t.deployment AND d.talkingbookid=t.talkingbookid AND d.contentid=t.contentid;

            INSERT INTO playstatistics SELECT * FROM mstemp ON CONFLICT DO NOTHING;
        """
        db.execute(text(query))
        db.commit()

    # Write HTML section to the report
    with open(temp_report, "a") as f:
        f.write('<div class="reportline">\n')
        f.write(open(temp_report, "r").read())
        f.write("</div>\n")


#  extractTbLoaderArtifacts "${dailyDir}/${statdir}">>"${report}.tmp"
def extract_tbloader_artifacts(directory):
    print(f"-------- extractTbLoaderArtifacts: in directory {directory} --------")
    wd = os.getcwd()
    os.chdir(directory)
    print(os.getcwd())

    for f in ["tbsdeployed.csv", "tbscollected.csv", "stats_collected.properties"]:
        if not os.path.exists(f):
            print(f"no existing {f}")
            if (
                subprocess.run(
                    ["unzip", "-p", "tbcd*.zip", f"*{f}"], stdout=open("tmp", "w")
                ).returncode
                == 0
            ):
                print(f"extracted {f} from zip")
                os.rename("tmp", f)
            else:
                print(f"could not extract {f} from zip")
        else:
            print(f"found existing {f}")

    os.chdir(wd)


def import_deployments(daily_dir: str):
    print(
        "-------- importDeployments: Importing Deployment installations to database. --------"
    )
    print(
        "<h2>Importing Deployment installations to database.</h2>",
        file=open(REPORT_FILE, "a"),
    )

    # Remove temporary file
    temp_report = f"{REPORT_FILE}.tmp"

    print("get tb-loader artifacts")

    # Iterate timestamp directories
    for statdir in os.listdir(daily_dir):
        statdir_path = os.path.join(daily_dir, statdir)
        if os.path.isdir(statdir_path):
            if verbose:
                print("extractTbLoaderArtifacts", statdir_path)

            if execute:
                extract_tbloader_artifacts(statdir_path)

    # Import into db and update tbsdeployed
    print(daily_dir)
    csv_insert_command = [
        "just",
        "csv-insert",
        "--table",
        "tbscollected",
        "--files",
        f"{daily_dir}/*Z/tbscollected.csv",
        "--verbose",
        "--c2ll",
        "--upsert",
    ]
    subprocess.run(
        csv_insert_command,
        stdout=open(temp_report, "a"),
        stderr=subprocess.STDOUT,
        text=True,
    )

    csv_insert_command = [
        "just",
        "csv-insert",
        "--table",
        "tbsdeployed",
        "--files",
        f"{daily_dir}/*Z/tbsdeployed.csv",
        "--verbose",
        "--c2ll",
        "--upsert",
    ]
    subprocess.run(
        csv_insert_command,
        stdout=open(temp_report, "a"),
        stderr=subprocess.STDOUT,
        text=True,
    )

    # Write HTML section to the report
    with open(REPORT_FILE, "a") as f:
        f.write('<div class="reportline">\n')
        f.write(open(temp_report, "r").read())
        f.write("</div>\n")

    # os.remove(temp_report)


def import_stats():
    global REPORT_FILE

    timestamp = datetime.now(timezone.utc).strftime("%Yy%mm%dd%Hh%Mm%Ss")
    curYear = datetime.now(timezone.utc).strftime("%Y")
    curMonth = datetime.now(timezone.utc).strftime("%m")
    curDay = datetime.now(timezone.utc).strftime("%d")

    s3DailyDir = f"{S3_STATS_BUCKET}/processed-data/{curYear}/{curMonth}/{curDay}"

    dailyDir = f"{PROCESSED_DATA_DIR}/{curYear}/{curMonth}/{curDay}"
    os.makedirs(dailyDir, exist_ok=True)
    dailyDir = os.path.abspath(dailyDir)

    timestampedDir = os.path.join(dailyDir, timestamp)
    os.makedirs(timestampedDir, exist_ok=True)

    s3archive = f"{S3_STATS_BUCKET}/archived-data-test/{curYear}/{curMonth}/{curDay}"

    recipientsfile = os.path.join(dailyDir, "recipients.csv")

    REPORT_FILE = os.path.abspath(os.path.join(dailyDir, "importStats.html"))
    if os.path.exists(REPORT_FILE):
        os.remove(REPORT_FILE)

    if not os.path.exists(LOGS_DIR):
        os.mkdir(LOGS_DIR)

    print(f"Stats root is {STATS_ROOT}")
    print(f"bin in {BIN}")
    print(f"core is {CORE_DIR}")
    print(f"acm is {ACM_DIR}")
    print(f"processed_data in {PROCESSED_DATA_DIR}")
    print(f"s3import in {S3_IMPORT}")
    print(f"s3archive in {s3archive}")
    print(f"s3uf in {S3_USER_FEEDBACK}")

    gather_files(daily_dir=dailyDir, timestamp=timestamp, s3_archive=s3archive)
    import_user_feedback(dailyDir)

    print(f"Gathered? {gatheredAny}")

    if gatheredAny:
        get_recipient_map(dailyDir)
        import_statistics(dailyDir)
        import_deployments(dailyDir)

        send_email(
            subject="Statistics & User Feedback imported",
            body=open(REPORT_FILE, "r").read(),
            recipients=["ictnotifications@amplio.org"],
            html=True,
        )

    # Adds and updates files, but won't remove anything.
    print(f"aws s3 sync {dailyDir} {s3DailyDir}")
    subprocess.run(["aws", "s3", "sync", dailyDir, s3DailyDir])

    # If the timestampedDir is empty, we don't want it. Same for the dailyDir. If can't remove, ignore error.

    subprocess.run(["rm", "--recursive", "--force", timestampedDir, "*"])
    if os.path.exists(timestampedDir):
        subprocess.run(
            ["rmdir", "--parents", "--ignore-fail-on-non-empty", timestampedDir]
        )


if __name__ == "__main__":
    import_stats()
