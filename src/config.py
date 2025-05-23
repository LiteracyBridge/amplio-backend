import json
from os import getenv, path
from pathlib import Path
from typing import Any, Optional

import sentry_sdk
from boto3 import Session
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader

AWS_REGION = "us-west-2"

# Audio Content Manager
ACM_PREFIX = "ACM-"

# Buckets
COLLECTED_STATS_BUCKET = "acm-stats"
PROGRAM_CONTENT_BUCKET = "amplio-program-content"
PROGRAM_SPEC_BUCKET = "amplio-progspecs"
ACM_LOGGING_BUCKET = "acm-logging"
STATISTICS_BUCKET = "acm-stats"
# PROGRAM_LIST_BUCKET = "dashboard-lb-stats"

# Mailing
MAIL_SOURCE_ADDR = "ictnotifications@amplio.org"


class Config:
    is_local: bool = False
    statistics_data_dir = path.expanduser("~/acm-stats")

    db_name: str
    db_host: str
    db_password: str
    db_user: str
    db_port: Optional[str] = "5432"
    db_echo: Optional[bool] = False

    dynamodb_url: Optional[str] = None

    user_pool_id: Optional[str] = None
    user_pool_client_id: list[str] = []

    sentry_dsn: Optional[str] = None
    sentry_environment: Optional[str] = None

    tableau_client_id: Optional[str] = None
    tableau_secret_id: Optional[str] = None
    tableau_secret_value: Optional[str] = None

    def __init__(self) -> None:
        if getenv("APP_ENV", "production") == "local":
            load_dotenv()

            self.is_local = True
            self.statistics_data_dir = path.expanduser(
                getenv("STATISTICS_DATA_DIR", "~/acm-stats")
            )

            self.db_name = getenv("DB_NAME", "amplio_dev")
            self.db_host = getenv("DB_HOST", "localhost")
            self.db_password = getenv("DB_PASSWORD", "")
            self.db_user = getenv("DB_USER", "postgres")
            self.db_port = getenv("DB_PORT", "5432")
            self.db_echo = bool(getenv("DB_ECHO", False))
            self.dynamodb_url = getenv("DYNAMODB_URL", None)

            self.sentry_dsn = getenv("SENTRY_DSN", None)
            self.sentry_environment = getenv("SENTRY_ENVIRONMENT", "local")

            self.user_pool_id = getenv("AWS_USER_POOL_ID", None)
            self.user_pool_client_id = getenv("AWS_USER_POOL_CLIENT_ID", "").split(",")

            self.tableau_client_id = getenv("TABLEAU_CLIENT_ID", None)
            self.tableau_secret_id = getenv("TABLEAU_SECRET_ID", None)
            self.tableau_secret_value = getenv("TABLEAU_SECRET_VALUE", None)
        else:
            self.load_aws_secrets()

    def load_aws_secrets(self):
        session = Session()
        client = session.client(
            # endpoint_url="http://localhost:4566",
            service_name="secretsmanager",
            region_name=AWS_REGION,
        )
        try:
            # Load postgres secrets
            secret_string = client.get_secret_value(SecretId=getenv("AWS_SECRET_ID"))[
                "SecretString"
            ]
            secrets = json.loads(secret_string)

            self.db_name = secrets["suite_dbname"]
            self.db_user = secrets["username"]
            self.db_password = secrets["password"]
            self.db_host = secrets["host"]
            self.db_port = secrets["port"]

            self.sentry_dsn = secrets["suite_sentry_dsn"]
            self.sentry_environment = secrets.get("sentry_environment", "prod")

            self.user_pool_id = secrets["aws_user_pool_id"]
            self.user_pool_client_id = secrets["aws_user_pool_client_id"].split(",")

            # Load tableau secrets
            # secret_string = client.get_secret_value(
            #     SecretId=getenv("TABLEAU_SECRET_ID", "tableau_embedding")
            # )["SecretString"]
            # secrets = json.loads(secret_string)

            self.tableau_client_id = getenv("TABLEAU_CLIENT_ID", None)
            self.tableau_secret_id = getenv("TABLEAU_SECRET_ID", None)
            self.tableau_secret_value = getenv("TABLEAU_SECRET_VALUE", None)

        except Exception as err:
            raise err

    def db_url(self):
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    def init_sentry(self):
        if self.sentry_dsn is not None:
            sentry_sdk.init(
                dsn=self.sentry_dsn,
                environment=self.sentry_environment,
                integrations=[],
                #     # Set traces_sample_rate to 1.0 to capture 100%
                #     # of transactions for performance monitoring.
                #     # We recommend adjusting this value in production,
                #     # traces_sample_rate=1.0,
            )

    def jinja(self, template):
        """Loads a Jinja template from the templates directory"""

        file_loader = FileSystemLoader(
            str(Path(__file__).resolve().parent) + "/templates"
        )
        env = Environment(loader=file_loader)
        template = env.get_template(template)

        return template


config = Config()
