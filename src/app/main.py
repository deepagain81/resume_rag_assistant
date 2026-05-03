"""Lightweight project entrypoint for local sanity checks."""

from __future__ import annotations

from app.config import (
    CANONICAL_PROFILE_PATH,
    CHUNKS_PATH,
    DEFAULT_EMBEDDING_MODEL,
    EMBEDDINGS_PATH,
)


def main() -> None:
    """Print current project configuration."""

    print("Resume RAG Assistant")
    print(f"Canonical profile: {CANONICAL_PROFILE_PATH}")
    print(f"Chunks output:      {CHUNKS_PATH}")
    print(f"Embeddings output:  {EMBEDDINGS_PATH}")
    print(f"Embedding model:    {DEFAULT_EMBEDDING_MODEL}")


if __name__ == "__main__":
    main()
