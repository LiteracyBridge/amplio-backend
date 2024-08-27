import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone

from config import STATISTICS_BUCKET
from database import get_db

STATS_ROOT = os.path.expanduser("~/acm-stats")
BIN = os.path.join(STATS_ROOT, "AWS-LB/bin")
CORE_DIR = os.path.join(BIN, "core-with-deps.jar")
ACM_DIR = os.path.join(BIN, "acm")
PROCESSED_DATA_DIR = os.path.join(STATS_ROOT, "processed-data")

S3_BUCKET = f"s3://{STATISTICS_BUCKET}"
S3_IMPORT = f"{S3_BUCKET}/collected-data"

email = os.path.join(BIN, "sendses.py")
ufexporter = os.path.join(BIN, "ufUtility/ufUtility.py")

gatheredAny = False
needcss = True
verbose = True
execute = True


def main():
    timestamp = datetime.now(timezone.utc).utcnow().strftime("%Yy%mm%dd%Hh%Mm%Ss")
    curYear = datetime.now(timezone.utc).strftime("%Y")
    curMonth = datetime.now(timezone.utc).strftime("%m")
    curDay = datetime.now(timezone.utc).strftime("%d")

    s3DailyDir = f"{S3_BUCKET}/processed-data/{curYear}/{curMonth}/{curDay}"
    dailyDir = f"{PROCESSED_DATA_DIR}/{curYear}/{curMonth}/{curDay}"

    os.makedirs(dailyDir, exist_ok=True)
    timestampedDir = os.path.join(dailyDir, timestamp)
    os.makedirs(timestampedDir, exist_ok=True)

    s3archive = f"{S3_BUCKET}/archived-data/{curYear}/{curMonth}/{curDay}"
    s3uf = "s3://amplio-uf/collected"

    recipientsfile = os.path.join(dailyDir, "recipients.csv")
    recipientsmapfile = os.path.join(dailyDir, "recipients_map.csv")

    report = os.path.join(dailyDir, "importStats.html")
    if os.path.exists(report):
        os.remove(report)

    gatheredAny = False
    verbose = True
    execute = True

    print(f"Stats root is {STATS_ROOT}")
    print(f"bin in {BIN}")
    print(f"core is {CORE_DIR}")
    print(f"acm is {ACM_DIR}")
    print(f"email is {email}")
    print(f"processed_data in {PROCESSED_DATA_DIR}")
    print(f"s3import in {S3_IMPORT}")
    print(f"s3archive in {s3archive}")
    print(f"s3uf in {s3uf}")

    gatherFiles(daily_dir=dailyDir, timestamp=timestamp, s3_archive=s3archive)
    importUserFeedback(dailyDir)

    print(f"Gathered? {gatheredAny}")

    if gatheredAny:
        # getRecipientMap ${dailyDir}
        # importStatistics ${dailyDir}
        # importDeployments ${dailyDir}
        sendMail()

    print(f"aws s3 sync {dailyDir} {s3DailyDir}")
    subprocess.run(["aws", "s3", "sync", dailyDir, s3DailyDir])
    if not os.path.exists(os.path.join(timestampedDir, "tmp")):
        os.remove(os.path.join(timestampedDir, "tmp"))
    os.rmdir(timestampedDir)


def gatherFiles(daily_dir: str, timestamp: str, s3_archive: str):
    print("-------- gatherFiles: Gathering the collected data from s3 --------")
    print("Gather from s3")

    tmpdir = tempfile.mkdtemp()
    print(f"temp:{tmpdir}")

    subprocess.run(["aws", "s3", "sync", S3_IMPORT, tmpdir], stdout=subprocess.PIPE)
    statslist = findZips(tmpdir)
    print("Process into collected-data")

    subprocess.run(
        [
            "java",
            "-cp",
            f"{ACM_DIR}/acm.jar:{ACM_DIR}/lib/*",
            "org.literacybridge.acm.utils.MoveStats",
            "-b",
            "blacklist.txt",
            tmpdir,
            daily_dir,
            timestamp,
        ]
    )

    for statfile in statslist:
        subprocess.run(
            ["aws", "s3", "mv", f"{S3_IMPORT}/{statfile}", f"{s3_archive}/{statfile}"],
            stdout=subprocess.PIPE,
        )

    subprocess.run(["cat", "reports3.raw"], stdout=subprocess.PIPE)
    if os.path.getsize("reports3.filtered") > 0:
        subprocess.run(["cat", "rpt.html"], stdout=subprocess.PIPE)

    shutil.rmtree(tmpdir)


def findZips(directory):
    zips = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".zip"):
                zips.append(os.path.join(root, file))
    return zips


def importUserFeedback(dailyDir):
    recordingsDir = os.path.join(dailyDir, "userrecordings")
    print(
        "-------- importUserFeedback: Importing user feedback audio to s3, metadata to database. --------"
    )
    print("Checking for user feedback recordings")
    if os.path.exists(recordingsDir):
        shutil.rmtree(recordingsDir)
    else:
        print(f"No directory {recordingsDir}")


def sendMail():
    pass


if __name__ == "__main__":
    main()
