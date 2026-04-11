from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Resume Assistant RAG"
    app_version: str = "0.1.0"


settings = Settings()
