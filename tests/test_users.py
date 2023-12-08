from fastapi.testclient import TestClient

from src import app
from . import cognito_login

client = TestClient(app.app)


def test_users_list(cognito_login):
    response = client.get(
        "/users",
        headers={"Authorization": f"Bearer {cognito_login}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "data": [
            {
                "id": 1,
                "name": "Admin",
                "permissions": [
                    {"module": ["permission-1", "permission-2", "permission-3"]},
                    {"module-2": ["permission-1", "permission-2", "permission-3"]},
                    {"acm_tbloader": ["can-create-deployment", "can-update-playlist"]},
                ],
            }
        ]
    }
