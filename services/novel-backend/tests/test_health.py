"""健康检查与启动钩子。"""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "novel-backend",
        "version": "1.0.0",
    }


def test_startup_hooks_replace_postgres_vector_store_and_object_storage(
    client: TestClient,
    startup_calls: list[str],
    caplog,
) -> None:
    assert startup_calls == ["postgres", "vector_store", "object_storage"]
    assert "数据库连接池预热" not in caplog.text
    assert "RAG 向量服务" not in caplog.text

    response = client.get("/health")
    assert response.status_code == 200
