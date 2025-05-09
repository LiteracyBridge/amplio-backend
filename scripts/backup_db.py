import os
import subprocess
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from config import config


def main():
    print(f"Running database backup at {datetime.now()}")

    load_dotenv()

    dest = os.path.expanduser("~") + "/.db-backups"
    if not os.path.exists(dest):
        os.makedirs(dest)

    timestamp = datetime.now().strftime("%Y%m%d")
    backup_file = f"{dest}/{config.db_name}_backup_{timestamp}.sql"

    # Create a backup of the database
    dump_command = f"pg_dump --host {config.db_host} --port {config.db_port} --username {config.db_user} --format=custom --blobs --verbose --file {backup_file} {config.db_name}"
    os.environ["PGPASSWORD"] = config.db_password
    subprocess.run(dump_command, shell=True, check=True)

    subprocess.run(
        f"aws s3 cp {backup_file} s3://{os.getenv('AWS_DB_BACKUP_BUCKET')}/",
        shell=True,
        check=True,
    )

    print(
        f"Database backup uploaded to s3://{os.getenv('AWS_DB_BACKUP_BUCKET')}/{backup_file}"
    )


if __name__ == "__main__":
    main()
