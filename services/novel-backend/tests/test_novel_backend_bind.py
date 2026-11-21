"""本地编排里小说后端端口默认只绑定本机回环地址。"""
from __future__ import annotations

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_PUBLISHED_PORT = '"${NOVEL_BACKEND_BIND:-127.0.0.1}:${NOVEL_BACKEND_PORT:-8000}:8000"'
_CONTAINER_HEALTHCHECK = '"http://localhost:8000/health"'


def test_novel_backend_published_port_defaults_to_loopback() -> None:
    compose = (_REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")

    assert _PUBLISHED_PORT in compose
    assert _CONTAINER_HEALTHCHECK in compose


def test_env_example_documents_novel_backend_bind() -> None:
    example = (_REPO_ROOT / ".env.example").read_text(encoding="utf-8")

    assert "NOVEL_BACKEND_BIND=127.0.0.1" in example
    assert "NOVEL_BACKEND_PORT=8000" in example
