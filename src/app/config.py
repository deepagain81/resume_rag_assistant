"""Shared configuration for the resume RAG ingestion pipeline."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "data"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"

CANONICAL_PROFILE_PATH = DATA_DIR / "canonical-profile.md"
CHUNKS_PATH = DATA_DIR / "resume_chunks.json"
EMBEDDINGS_PATH = DATA_DIR / "resume_embeddings.json"

DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"

# R2 object keys used by the Cloudflare Worker runtime.
R2_CHUNKS_OBJECT_KEY = "dataset/v2/resume_chunks.json"
R2_EMBEDDINGS_OBJECT_KEY = "dataset/v2/resume_embeddings.json"
