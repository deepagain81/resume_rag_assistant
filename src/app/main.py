from fastapi import FastAPI

from app.config import settings
from app.schemas import QueryRequest, QueryResponse
from app.services.rag_service import RagService

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

rag_service = RagService()


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "message": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query(payload: QueryRequest) -> QueryResponse:
    return rag_service.answer_query(payload.question)
