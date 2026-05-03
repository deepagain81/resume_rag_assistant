"""Typed schemas for generated RAG artifacts."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

EntityType = Literal[
    "professional_experience",
    "project",
    "research_experience",
    "presentation",
    "education",
    "skills",
    "credential",
    "assistant_instruction",
    "profile_context",
]

ClaimSensitivity = Literal[
    "standard",
    "metrics_present",
    "claim_boundary",
    "instructional",
]


class ChunkMetadata(TypedDict, total=False):
    document_id: str
    document_type: str
    version: str
    owner: str
    persona_mode: str
    source_file: str
    section_path: list[str]
    section_title: str
    heading_level: int
    entity_type: EntityType
    company: str | None
    employer: str | None
    product: str | None
    role: str | None
    date_range: str | None
    tags: list[str]
    claim_sensitivity: ClaimSensitivity
    chunk_index: int
    part_index: int
    word_count: int
    content_hash: str


class Chunk(TypedDict):
    id: str
    content: str
    content_for_embedding: str
    metadata: ChunkMetadata


class ChunksFile(TypedDict):
    schema_version: str
    generated_from: str
    chunking_strategy: dict[str, Any]
    source_metadata: dict[str, Any]
    chunk_count: int
    chunks: list[Chunk]


class EmbeddingItem(TypedDict, total=False):
    chunk_id: str
    content_hash: str
    section_path: list[str]
    entity_type: EntityType
    company: str | None
    product: str | None
    tags: list[str]
    embedding: list[float]


class EmbeddingsFile(TypedDict):
    schema_version: str
    status: str
    generated_at: str
    generated_from: str
    source_schema_version: str
    source_chunk_count: int
    embedding_count: int
    embedding_model: str
    embedding_dimensions: int
    embedding_input_field: str
    usage: dict[str, int]
    embeddings: list[EmbeddingItem]
