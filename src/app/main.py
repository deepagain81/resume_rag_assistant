from typing import Annotated

from fastapi import Depends, FastAPI

from app.config import Settings, get_settings
from app.schemas import QueryRequest, QueryResponse
from app.services.rag_service import RagService

app = FastAPI()

rag_service = RagService()

# Dependency injection for settings
SettingsDep = Annotated[Settings, Depends(get_settings)]


@app.get("/")
def read_root(settings: SettingsDep) -> dict[str, str]:
    return {
        "msg": settings.app_name,
        "v": settings.app_version,
        "env": settings.app_env,
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query(payload: QueryRequest) -> QueryResponse:
    return rag_service.answer_query(payload.question)
