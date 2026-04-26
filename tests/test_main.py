import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)


def test_read_root() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "msg": "Resume Assistant RAG",
        "v": "0.2.0",
        "env": "dev",
    }


def test_health_check() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_query() -> None:
    response = client.post("/query", json={"question": "Summarize my resume"})

    assert response.status_code == 200
    assert response.json() == {
        "answer": "Summarize my resume",
        "source": "stub",
    }


def test_settings_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.app_env == "test"

    get_settings.cache_clear()
