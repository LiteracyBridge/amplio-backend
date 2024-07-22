from boto3 import client

from config import AWS_REGION, MAIL_SOURCE_ADDR


def send_email(subject: str, body: str, recipients: list[str] = [MAIL_SOURCE_ADDR]):
    ses_client = client("ses", region_name=AWS_REGION)

    ses_client.send_email(
        Source=MAIL_SOURCE_ADDR,
        Destination={
            "ToAddresses": recipients,
        },
        Message={
            "Subject": {"Data": subject, "Charset": "utf-8"},
            "Body": {
                "Html": {"Data": body, "Charset": "utf-8"},
                # "Text": {
                #     "Charset": "utf-8",
                #     "Data": "Hello Working",
                # },
            },
        },
    )
