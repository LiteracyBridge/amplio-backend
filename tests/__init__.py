from os import environ
from pytest import fixture
from moto import mock_s3, mock_cognitoidp
import boto3


@fixture(scope="function")
def aws_credentials():
    """Mocked AWS Credentials for moto."""
    environ["AWS_ACCESS_KEY_ID"] = "testing"
    environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    environ["AWS_SECURITY_TOKEN"] = "testing"
    environ["AWS_SESSION_TOKEN"] = "testing"
    environ["AWS_DEFAULT_REGION"] = "us-east-1"


@fixture(scope="function")
def s3(aws_credentials):
    with mock_s3():
        yield boto3.client("s3", region_name="us-east-1")


@mock_cognitoidp
def test_cognitoidp_behaviour():
    boto3.client("cognito-idp")


@mock_cognitoidp
def test_cognito():
    pass


@fixture(scope="function")
@mock_cognitoidp
def cognito_login():
    region = "us-west-1"
    username = "test_username"
    password = "SecurePassword1234#$%"  # Password must meet security policies.
    email = "test_mail@test.com"

    cognito_client = boto3.client("cognito-idp", region_name=region)
    user_pool_id = cognito_client.create_user_pool(PoolName="TestUserPool")["UserPool"][
        "Id"
    ]

    app_client = cognito_client.create_user_pool_client(
        UserPoolId=user_pool_id, ClientName="TestAppClient"
    )
    cognito_client.sign_up(
        ClientId=app_client["UserPoolClient"]["ClientId"],
        Username=username,
        Password=password,
        UserAttributes=[
            {"Name": "email", "Value": email},
        ],
    )

    cognito_client.admin_confirm_sign_up(UserPoolId=user_pool_id, Username=username)

    access_token = cognito_client.admin_initiate_auth(
        UserPoolId=user_pool_id,
        ClientId=app_client["UserPoolClient"]["ClientId"],
        AuthFlow="ADMIN_NO_SRP_AUTH",
        AuthParameters={"USERNAME": username, "PASSWORD": password},
    )["AuthenticationResult"]["AccessToken"]

    return access_token
