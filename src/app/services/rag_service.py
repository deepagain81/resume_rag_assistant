from app.schemas import QueryResponse


class RagService:
    def answer_query(self, question: str) -> QueryResponse:
        cleaned_question = question.strip()

        return QueryResponse(
            answer=f"{cleaned_question}",
            source="stub",
        )
