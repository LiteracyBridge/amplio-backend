from boto3 import client

from config import AWS_REGION, MAIL_SOURCE_ADDR


def send_email(
    subject: str,
    body: str,
    recipients: list[str] = [MAIL_SOURCE_ADDR],
    html: bool = True,
):
    ses_client = client("ses", region_name=AWS_REGION)

    if html:
        ses_client.send_email(
            Source=MAIL_SOURCE_ADDR,
            Destination={
                "ToAddresses": recipients,
            },
            Message={
                "Subject": {"Data": subject, "Charset": "utf-8"},
                "Body": {
                    "Html": {"Data": body, "Charset": "utf-8"},
                },
            },
        )
    else:
        ses_client.send_email(
            Source=MAIL_SOURCE_ADDR,
            Destination={
                "ToAddresses": recipients,
            },
            Message={
                "Subject": {"Data": subject, "Charset": "utf-8"},
                "Body": {
                    "Text": {
                        "Charset": "utf-8",
                        "Data": body,
                    },
                },
            },
        )
