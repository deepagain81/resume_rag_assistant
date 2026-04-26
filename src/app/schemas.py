from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question for the assistant")


class QueryResponse(BaseModel):
    answer: str
    source: str
