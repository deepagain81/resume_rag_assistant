from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_read_root() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Resume Assistant RAG",
        "version": "0.1.0",
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
