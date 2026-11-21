"""时间线进度推送只发给所有者。

公开接口是 GET /canvas/timeline/{timeline_id}/stream。
所有者收到与改动前相同的 connected 事件；其他人与不存在的时间线得到 404，且不打开事件流。
所有者查询由 timeline_owners 夹具替换，不连接数据库。
"""
from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient

OWNER_ID = "11111111-1111-1111-1111-111111111111"
OTHER_ID = "22222222-2222-2222-2222-222222222222"
TIMELINE_ID = "tl-1"


async def _read_until_connected_or_complete(
    app: object,
    path: str,
    headers: dict[str, str],
) -> tuple[int, str, str]:
    """读到 connected，或响应结束。404 不能一直等事件。"""
    import anyio

    request_sent = False
    finished = anyio.Event()
    status_code = 0
    content_type = ""
    chunks: list[bytes] = []

    async def receive() -> dict[str, object]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": b"", "more_body": False}
        await finished.wait()
        return {"type": "http.disconnect"}

    async def send(message: dict[str, object]) -> None:
        nonlocal status_code, content_type
        if message["type"] == "http.response.start":
            status = message["status"]
            assert isinstance(status, int)
            status_code = status
            raw_headers = message.get("headers", [])
            assert isinstance(raw_headers, list)
            for item in raw_headers:
                assert isinstance(item, tuple)
                key, value = item
                assert isinstance(key, bytes)
                assert isinstance(value, bytes)
                if key.lower() == b"content-type":
                    content_type = value.decode()
        elif message["type"] == "http.response.body":
            body = message.get("body", b"")
            if isinstance(body, bytes) and body:
                chunks.append(body)
            if b"connected" in b"".join(chunks) or message.get("more_body") is False:
                finished.set()

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "path": path,
        "raw_path": path.encode(),
        "root_path": "",
        "scheme": "http",
        "query_string": b"",
        "headers": [(key.lower().encode(), value.encode()) for key, value in headers.items()],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "state": {},
    }
    await app(scope, receive, send)  # type: ignore[operator]
    return status_code, content_type, b"".join(chunks).decode()


def _open_stream(
    client: TestClient,
    token_for: Callable[[str], str],
    user_id: str,
) -> tuple[int, str, str]:
    assert client.portal is not None
    headers = {"Authorization": f"Bearer {token_for(user_id)}"}
    return client.portal.call(
        _read_until_connected_or_complete,
        client.app,
        f"/canvas/timeline/{TIMELINE_ID}/stream",
        headers,
    )


def test_owner_receives_connected_event(
    client: TestClient,
    sign_user_token: Callable[[str], str],
    timeline_owners: dict[str, str],
) -> None:
    timeline_owners[TIMELINE_ID] = OWNER_ID

    status_code, content_type, body = _open_stream(client, sign_user_token, OWNER_ID)

    assert status_code == 200
    assert content_type.startswith("text/event-stream")
    assert 'data: {"type": "connected", "timeline_id": "tl-1",' in body


def test_missing_timeline_gets_404_without_stream(
    client: TestClient,
    sign_user_token: Callable[[str], str],
    timeline_owners: dict[str, str],
) -> None:
    assert TIMELINE_ID not in timeline_owners

    status_code, content_type, body = _open_stream(client, sign_user_token, OWNER_ID)

    assert status_code == 404
    assert "text/event-stream" not in content_type
    assert "connected" not in body
    assert body == '{"detail":"时间线不存在"}'


def test_other_user_gets_404_without_stream(
    client: TestClient,
    sign_user_token: Callable[[str], str],
    timeline_owners: dict[str, str],
) -> None:
    timeline_owners[TIMELINE_ID] = OWNER_ID

    status_code, content_type, body = _open_stream(client, sign_user_token, OTHER_ID)

    assert status_code == 404
    assert "text/event-stream" not in content_type
    assert "connected" not in body
    assert body == '{"detail":"时间线不存在"}'
