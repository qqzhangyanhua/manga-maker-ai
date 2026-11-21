"""画布接口要求有效用户身份。

从应用注册表枚举全部 /canvas 接口。
未受保护的新接口无法通过缺凭据断言。
有效令牌时请求进入处理逻辑并成功；模型服务由夹具打桩。
"""
from __future__ import annotations

import re
from collections.abc import Callable

from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

_PATH_PARAM = re.compile(r"\{[^/}]+\}")


def _canvas_operations(client: TestClient) -> list[tuple[str, str]]:
    operations: list[tuple[str, str]] = []
    for route in client.app.routes:
        if not isinstance(route, APIRoute) or not route.path.startswith("/canvas"):
            continue
        for method in sorted(route.methods or []):
            # FastAPI 给 GET 自动登记 HEAD，同一接口只按业务方法断言。
            if method == "HEAD":
                continue
            operations.append((method, route.path))
    assert operations, "应用中没有注册 /canvas 接口"
    return operations


def _concrete_path(path: str) -> str:
    return _PATH_PARAM.sub("tl-1", path)


def _call(
    client: TestClient,
    method: str,
    path: str,
    headers: dict[str, str] | None = None,
    payload: object | None = None,
) -> tuple[int, object]:
    kwargs: dict[str, object] = {}
    if headers is not None:
        kwargs["headers"] = headers
    if payload is not None:
        kwargs["json"] = payload
    with client.stream(method, path, **kwargs) as response:
        content_type = response.headers.get("content-type", "")
        if "text/event-stream" in content_type:
            return response.status_code, {"_stream": content_type}
        response.read()
        return response.status_code, response.json()


def test_every_canvas_route_rejects_missing_credentials(client: TestClient) -> None:
    expected = client.post("/inspiration/start")
    assert expected.status_code == 403
    assert expected.json() == {"detail": "Not authenticated"}

    for method, path in _canvas_operations(client):
        status, body = _call(client, method, _concrete_path(path))
        assert status == expected.status_code, (method, path, status, body)
        assert body == expected.json(), (method, path, body)


def test_every_canvas_route_rejects_invalid_token(client: TestClient) -> None:
    headers = {"Authorization": "Bearer not-a-valid-token"}
    expected = client.post("/inspiration/start", headers=headers)
    assert expected.status_code == 401
    assert expected.json() == {"detail": "无效的认证凭证"}

    for method, path in _canvas_operations(client):
        status, body = _call(client, method, _concrete_path(path), headers=headers)
        assert status == expected.status_code, (method, path, status, body)
        assert body == expected.json(), (method, path, body)


USER_ID = "11111111-1111-1111-1111-111111111111"

# 每个已注册接口的最小成功请求。新接口必须补上，否则枚举对不上。
_SUCCESS_CASES: dict[tuple[str, str], dict[str, object]] = {
    ("POST", "/canvas/analyze-script"): {
        "payload": {"chapter_content": "甲站在室内。", "chapter_number": 1},
        "marker": ("segments", 0, "content", "桩：室内对白"),
    },
    ("POST", "/canvas/plan-shots"): {
        "payload": {
            "script_content": "甲走进房间",
            "scene_description": "室内",
            "character_actions": "走进",
        },
        "marker": ("shots", 0, "prompt", "桩提示词"),
    },
    ("POST", "/canvas/generate-finals"): {
        "payload": {
            "scenes": [
                {
                    "scene_id": "s1",
                    "shot_id": "h1",
                    "image_url": "http://127.0.0.1:9/a.png",
                }
            ],
            "comic_style": "manga",
            "add_speech_bubbles": True,
        },
        "marker": ("panels", 0, "generation_prompt", "桩：漫画图"),
    },
    ("POST", "/canvas/identify-characters"): {
        "payload": {
            "dialogue": "甲：你好",
            "scene_description": "室内",
            "available_characters": [{"id": "c1", "name": "甲"}],
        },
        "marker": ("matched_character_ids", 0, "c1"),
    },
    ("POST", "/canvas/batch-identify-characters"): {
        "payload": {
            "shots": [{"shot_id": "h1", "dialogue": "甲：你好", "description": "室内"}],
            "available_characters": [{"id": "c1", "name": "甲"}],
        },
        "marker": ("summary", "shots_with_characters", 1),
    },
    ("GET", "/canvas/timeline/{timeline_id}/stream"): {},
}


async def _read_open_event_stream(app: object, path: str, headers: dict[str, str]) -> tuple[int, str]:
    """读到第一条 connected 事件后断开。

    TestClient 会等响应结束才返回，而时间线推送保持连接，不能用它读这条流。
    """
    import anyio

    request_sent = False
    disconnected = anyio.Event()
    status_code = 0
    content_type = ""
    chunks: list[bytes] = []

    async def receive() -> dict[str, object]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": b"", "more_body": False}
        await disconnected.wait()
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
            if b"connected" in b"".join(chunks):
                disconnected.set()

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
    assert content_type.startswith("text/event-stream"), content_type
    return status_code, b"".join(chunks).decode()


def _marker_value(body: object, marker: tuple[object, ...]) -> object:
    value = body
    for step in marker[:-1]:
        if isinstance(step, int):
            assert isinstance(value, list)
            value = value[step]
        else:
            assert isinstance(value, dict)
            value = value[step]
    return value


def test_every_canvas_route_succeeds_with_valid_token(
    client: TestClient,
    sign_user_token: Callable[[str], str],
    canvas_services: None,
    timeline_owners: dict[str, str],
) -> None:
    operations = _canvas_operations(client)
    assert set(operations) == set(_SUCCESS_CASES)
    # 进度流在连接前核对所有者。这条用例的时间线属于当前用户。
    timeline_owners["tl-1"] = USER_ID

    headers = {"Authorization": f"Bearer {sign_user_token(USER_ID)}"}
    for method, path in operations:
        concrete = _concrete_path(path)
        case = _SUCCESS_CASES[(method, path)]
        if path.endswith("/stream"):
            assert client.portal is not None
            status_code, text = client.portal.call(_read_open_event_stream, client.app, concrete, headers)
            assert status_code == 200, (method, path, status_code, text)
            assert 'data: {"type": "connected", "timeline_id": "tl-1",' in text
            continue

        status, body = _call(client, method, concrete, headers=headers, payload=case["payload"])
        assert status == 200, (method, path, status, body)
        assert isinstance(body, dict)
        assert body["success"] is True
        marker = case["marker"]
        assert isinstance(marker, tuple)
        assert _marker_value(body, marker) == marker[-1]
