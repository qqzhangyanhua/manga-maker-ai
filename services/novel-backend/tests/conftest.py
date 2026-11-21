"""进程内测试夹具：客户端、用户令牌、画布模型桩、可替换的启动钩子。"""
from __future__ import annotations

import logging
import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

# 必须在导入应用之前写入。环境变量优先于 .env，测试不会连真实数据库或模型。
os.environ["DATABASE_URL"] = "postgresql://pytest:pytest@127.0.0.1:1/novel_pytest"
os.environ["JWT_SECRET"] = "pytest-jwt-secret-must-be-32-chars!"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["OPENAI_API_KEY"] = "sk-pytest-not-a-real-key"
os.environ["OPENAI_API_BASE"] = "http://127.0.0.1:9/v1"
os.environ["MINIO_ENDPOINT"] = "127.0.0.1:1"
os.environ["MINIO_ACCESS_KEY"] = "pytest"
os.environ["MINIO_SECRET_KEY"] = "pytest-secret"
os.environ["MINIO_BUCKET_NAME"] = "pytest-bucket"
os.environ["MINIO_USE_SSL"] = "false"
os.environ["RAG_ENABLE_VECTOR_SEARCH"] = "true"
os.environ["CHROMA_PERSIST_DIR"] = "./tests/_chroma_unused"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"
os.environ["ENVIRONMENT"] = "development"


class _StubStartupHooks:
    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    async def postgres(self) -> None:
        self._calls.append("postgres")

    def vector_store(self) -> None:
        self._calls.append("vector_store")

    def object_storage(self) -> None:
        self._calls.append("object_storage")


@pytest.fixture
def startup_calls() -> list[str]:
    return []


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, startup_calls: list[str], caplog: pytest.LogCaptureFixture) -> Iterator[TestClient]:
    from app import main as main_module

    caplog.set_level(logging.INFO)
    monkeypatch.setattr(main_module, "startup_hooks", _StubStartupHooks(startup_calls))
    with TestClient(main_module.app) as test_client:
        yield test_client


@pytest.fixture
def sign_user_token():
    from datetime import datetime, timedelta, timezone

    from jose import jwt
    from app.config import settings

    def _sign(user_id: str) -> str:
        token = jwt.encode(
            {
                "userId": user_id,
                "role": "user",
                "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp()),
            },
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )
        if isinstance(token, bytes):
            return token.decode("ascii")
        return token

    return _sign


@pytest.fixture
def canvas_services(monkeypatch: pytest.MonkeyPatch) -> None:
    from tests.canvas_stubs import install_canvas_stubs

    install_canvas_stubs(monkeypatch)


@pytest.fixture
def timeline_owners(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    """替换时间线所有者查询。写入 timeline_id -> user_id；未登记视为不存在。"""
    owners: dict[str, str] = {}

    async def lookup(timeline_id: str) -> str | None:
        return owners.get(timeline_id)

    from app.routers import canvas as canvas_router

    monkeypatch.setattr(canvas_router, "find_canvas_timeline_owner_id", lookup)
    return owners
