import subprocess
from os import getenv

if __name__ == "__main__":
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
