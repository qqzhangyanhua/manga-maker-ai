"""已有受保护接口的身份冒烟。

选用 POST /inspiration/start：它要求登录，成功路径不访问数据库。
"""
from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient

USER_ID = "11111111-1111-1111-1111-111111111111"


def test_protected_route_rejects_missing_credentials(client: TestClient) -> None:
    response = client.post("/inspiration/start")

    assert response.status_code == 403


def test_protected_route_accepts_fixture_token(
    client: TestClient,
    sign_user_token: Callable[[str], str],
) -> None:
    token = sign_user_token(USER_ID)
    response = client.post(
        "/inspiration/start",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["question"] == "你想写什么类型的故事？"
    assert body["step"] == 1
