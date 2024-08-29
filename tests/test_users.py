from fastapi.testclient import TestClient

from src import app  # type: ignore
from . import cognito_login

client = TestClient(app.app)


def test_users_list(cognito_login):
    # TODO: add organisation id to request headers
    response = client.get(
        "/users",
        headers={"Authorization": f"Bearer {cognito_login}"},
    )

    assert response.status_code == 200
    assert response.json()["data"] == [
        {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "email": "johndoe@example.com",
            "other_names": "Walker Stones",
        },
        {
            "id": 2,
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "doemark@example.com",
            "other_names": "Walker Stones",
        },
    ]
