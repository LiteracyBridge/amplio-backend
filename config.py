import json
from typing import Any, Optional

from boto3 import Session
from dotenv import load_dotenv
from pydantic import BaseSettings, BaseModel
from pydantic.env_settings import SettingsSourceCallable
from os import getenv

AWS_REGION = "us-west-2"


class Settings:
    db_name: str
    db_host: str
    db_password: str
    db_user: str
    db_port: Optional[str] = "5432"

    user_pool_id: Optional[str] = None
    user_pool_client_id: Optional[str] = None

    sentry_dsn: Optional[str] = None

    is_local: bool = False

    def __init__(self) -> None:
        if getenv("APP_ENV", "production") == "local":
            load_dotenv()

            self.is_local = True
            self.db_name = getenv("DB_NAME", "amplio_dev")
            self.db_host = getenv("DB_HOST", "localhost")
            self.db_password = getenv("DB_PASSWORD", "")
            self.db_user = getenv("DB_USER", "postgres")
            self.db_port = getenv("DB_PORT", "5432")
            self.sentry_dsn = getenv("SENTRY_DSN", None)

            self.user_pool_id = getenv("AWS_USER_POOL_ID", None)
            self.user_pool_client_id = getenv("AWS_USER_POOL_CLIENT_ID", None)
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
            secret_string = client.get_secret_value(SecretId="lb_stats_test")[
                "SecretString"
            ]
            secrets = json.loads(secret_string)

            self.db_name = secrets["dbname"]
            self.db_user = secrets["username"]
            self.db_password = secrets["password"]
            self.db_host = secrets["host"]
            self.db_port = secrets["port"]
            self.sentry_dsn = secrets["uf_sentry_dsn"]

            self.user_pool_id = secrets["aws_user_pool_id"]
            self.user_pool_client_id = secrets["aws_user_pool_client_id"]

        except Exception as err:
            raise err

    def db_url(self):
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


settings = Settings()
