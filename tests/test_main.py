from __future__ import annotations

from app.config import (
    CANONICAL_PROFILE_PATH,
    CHUNKS_PATH,
    DEFAULT_EMBEDDING_MODEL,
    EMBEDDINGS_PATH,
    R2_CHUNKS_OBJECT_KEY,
    R2_EMBEDDINGS_OBJECT_KEY,
)


def test_config_paths_are_defined() -> None:
    assert CANONICAL_PROFILE_PATH.name == "canonical-profile.md"
    assert CHUNKS_PATH.name == "resume_chunks.json"
    assert EMBEDDINGS_PATH.name == "resume_embeddings.json"


def test_default_embedding_model() -> None:
    assert DEFAULT_EMBEDDING_MODEL == "text-embedding-3-small"


def test_r2_object_keys() -> None:
    assert R2_CHUNKS_OBJECT_KEY == "dataset/v2/resume_chunks.json"
    assert R2_EMBEDDINGS_OBJECT_KEY == "dataset/v2/resume_embeddings.json"
