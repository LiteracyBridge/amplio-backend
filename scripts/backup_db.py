import os
import subprocess
from datetime import datetime

from dotenv import load_dotenv

from config import config


def main():
    load_dotenv()

    print(f"Running database backup at {datetime.now()}")

    dest = os.getenv("DB_BACKUP_DIR")
    if dest is None:
        print("DB_BACKUP_DIR is not set, existing ....")
        exit(1)

    dest = os.path.expanduser(dest)
    if not os.path.exists(dest):
        os.makedirs(dest)

    timestamp = datetime.now().strftime("%Y%m%d")
    backup_file = f"{dest}/{config.db_name}_backup_{timestamp}.sql"

    # Create a backup of the database
    dump_command = f"pg_dump --host {config.db_host} --port {config.db_port} --username {config.db_user} --format=custom --blobs --verbose --file {backup_file} {config.db_name}"
    os.environ["PGPASSWORD"] = config.db_password
    subprocess.run(dump_command, shell=True, check=True)

    subprocess.run(
        f"aws s3 cp {backup_file} s3://{os.getenv('S3_DB_BACKUP_BUCKET')}/",
        shell=True,
        check=True,
    )

    print(
        f"Database backup uploaded to s3://{os.getenv('AWS_DB_BACKUP_BUCKET')}/{backup_file}"
    )


if __name__ == "__main__":
    main()
