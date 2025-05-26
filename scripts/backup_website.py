import re
import subprocess
from datetime import datetime
from os import environ, getenv, makedirs, path


def backup_media():
    media_path = getenv("WEBSITE_MEDIA_DIR")
    if media_path is None:
        print("WEBSITE_MEDIA_DIR path is not set, existing ...")
        exit(1)

    media_bucket = getenv("S3_WEBSITE_MEDIA_BUCKET")
    if media_bucket is None:
        print("S3_WEBSITE_MEDIA_BUCKET name is not set, existing ...")
        exit(1)

    subprocess.run(
        f"aws s3 sync {media_path} s3://{media_bucket}/",
        shell=True,
        check=True,
    )


def backup_db():
    url = getenv("WEBSITE_DB_URL")
    if url is None:
        print("WEBSITE_DB_URL is not set, existing ....")
        exit(1)

    regex = r"postgresql:\/\/(?P<host>\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}):(?P<port>\d+)\/(?P<db>\w+)\?user=(?P<user>[\w_]+)&password=(?P<password>[\w\d\W]+)"

    matches = re.match(regex, url)
    if matches is None:
        print(f"Invalid database url: ${url}")
        exit(1)

    config = matches.groupdict()

    dest = getenv("DB_BACKUP_DIR")
    if dest is None:
        print("DB_BACKUP_DIR is not set, existing ....")
        exit(1)

    dest = path.expanduser(dest)
    if not path.exists(dest):
        makedirs(dest)

    timestamp = datetime.now().strftime("%Y%m%d")
    backup_file = f"{dest}/{config['db']}_backup_{timestamp}.sql"

    # Create a backup of the database
    dump_command = f"pg_dump --host {config['host']} --port {config['port']} --username {config['user']} --format=custom --blobs --verbose --file {backup_file} {config['db']}"
    environ["PGPASSWORD"] = config["password"]
    subprocess.run(dump_command, shell=True, check=True)

    bucket = getenv("S3_DB_BACKUP_BUCKET")
    subprocess.run(
        f"aws s3 cp {backup_file} s3://{bucket}/",
        shell=True,
        check=True,
    )

    print(f"Database backup uploaded to s3://{bucket}{backup_file}")


if __name__ == "__main__":
    backup_media()
    backup_db()
