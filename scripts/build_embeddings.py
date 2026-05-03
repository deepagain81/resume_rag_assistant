#!/usr/bin/env python3
"""
Generate resume_embeddings.json from resume_chunks.json for a resume-aware RAG system.

Usage:
  export OPENAI_API_KEY="your_api_key"

  python scripts/build_embeddings.py \
    --input data/resume_chunks.json \
    --output data/resume_embeddings.json \
    --model text-embedding-3-small

"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

try:
    from openai import OpenAI
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: openai\n" "Install it with:\n" "  pip install openai\n"
    ) from exc


DEFAULT_MODEL = "text-embedding-3-small"
DEFAULT_BATCH_SIZE = 64
MAX_RETRIES = 5


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected top-level JSON object in: {path}")
    return cast(dict[str, Any], payload)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def batched(items: list[Any], batch_size: int) -> list[list[Any]]:
    return [items[i : i + batch_size] for i in range(0, len(items), batch_size)]


def validate_chunks_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    chunks = payload.get("chunks")

    if not isinstance(chunks, list) or not chunks:
        raise ValueError("Input JSON must contain a non-empty 'chunks' array.")

    seen_ids: set[str] = set()

    for index, chunk in enumerate(chunks, start=1):
        if not isinstance(chunk, dict):
            raise ValueError(f"Chunk #{index} must be an object.")

        chunk_id = chunk.get("id")
        content_for_embedding = chunk.get("content_for_embedding")
        content_hash = chunk.get("metadata", {}).get("content_hash")

        if not chunk_id or not isinstance(chunk_id, str):
            raise ValueError(f"Chunk #{index} is missing a valid 'id'.")

        if chunk_id in seen_ids:
            raise ValueError(f"Duplicate chunk id found: {chunk_id}")

        if not content_for_embedding or not isinstance(content_for_embedding, str):
            raise ValueError(f"Chunk '{chunk_id}' is missing a valid 'content_for_embedding'.")

        if not content_hash:
            raise ValueError(
                f"Chunk '{chunk_id}' is missing metadata.content_hash. "
                "Regenerate resume_chunks.json with build_chunks.py."
            )

        seen_ids.add(chunk_id)

    return chunks


def load_existing_embeddings(output_path: Path) -> dict[str, dict[str, Any]]:
    """
    Supports resumable generation.

    If resume_embeddings.json already exists, this returns existing vectors by chunk_id.
    The script will reuse only embeddings whose content_hash still matches.
    """
    if not output_path.exists():
        return {}

    try:
        payload = load_json(output_path)
    except Exception:
        return {}

    existing: dict[str, dict[str, Any]] = {}

    for item in payload.get("embeddings", []):
        chunk_id = item.get("chunk_id")
        if chunk_id:
            existing[chunk_id] = item

    return existing


def create_embeddings_with_retry(
    client: OpenAI,
    *,
    model: str,
    inputs: list[str],
    dimensions: int | None,
) -> tuple[list[list[float]], dict[str, int]]:
    """
    Calls OpenAI embeddings API with exponential backoff.

    Returns:
      - embeddings in the same order as inputs
      - usage metadata when available
    """
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "input": inputs,
                "encoding_format": "float",
            }

            if dimensions is not None:
                kwargs["dimensions"] = dimensions

            response = client.embeddings.create(**kwargs)

            data = sorted(response.data, key=lambda item: item.index)
            embeddings = [item.embedding for item in data]

            usage = {
                "prompt_tokens": (
                    getattr(response.usage, "prompt_tokens", 0) if response.usage else 0
                ),
                "total_tokens": getattr(response.usage, "total_tokens", 0) if response.usage else 0,
            }

            return embeddings, usage

        except Exception as exc:
            last_error = exc
            sleep_seconds = min(2**attempt, 30)
            print(
                f"Embedding request failed on attempt {attempt}/{MAX_RETRIES}: {exc}",
                file=sys.stderr,
            )

            if attempt < MAX_RETRIES:
                time.sleep(sleep_seconds)

    raise RuntimeError(f"Embedding request failed after {MAX_RETRIES} attempts") from last_error


def build_embeddings(
    *,
    chunks_payload: dict[str, Any],
    output_path: Path,
    model: str,
    batch_size: int,
    dimensions: int | None,
    dry_run: bool,
) -> dict[str, Any]:
    chunks = validate_chunks_payload(chunks_payload)
    existing = load_existing_embeddings(output_path)

    embeddings_by_chunk_id: dict[str, dict[str, Any]] = {}
    chunks_to_embed: list[dict[str, Any]] = []

    for chunk in chunks:
        chunk_id = chunk["id"]
        content_hash = chunk["metadata"]["content_hash"]

        existing_item = existing.get(chunk_id)

        if existing_item and existing_item.get("content_hash") == content_hash:
            embeddings_by_chunk_id[chunk_id] = existing_item
        else:
            chunks_to_embed.append(chunk)

    if dry_run:
        return {
            "schema_version": "1.0.0",
            "status": "dry_run",
            "model": model,
            "dimensions": dimensions,
            "source_chunk_count": len(chunks),
            "existing_reusable_embeddings": len(embeddings_by_chunk_id),
            "chunks_to_embed": len(chunks_to_embed),
            "batch_size": batch_size,
            "generated_at": utc_now_iso(),
        }

    if not os.getenv("OPENAI_API_KEY"):
        raise OSError("OPENAI_API_KEY is not set. Run:\n" "  export OPENAI_API_KEY='your_api_key'")

    client = OpenAI()

    total_prompt_tokens = 0
    total_tokens = 0

    for batch_number, batch in enumerate(batched(chunks_to_embed, batch_size), start=1):
        inputs = [chunk["content_for_embedding"] for chunk in batch]

        print(
            f"Embedding batch {batch_number} "
            f"({len(batch)} chunks, {len(embeddings_by_chunk_id)}/{len(chunks)} already complete)"
        )

        vectors, usage = create_embeddings_with_retry(
            client,
            model=model,
            inputs=inputs,
            dimensions=dimensions,
        )

        total_prompt_tokens += usage.get("prompt_tokens", 0)
        total_tokens += usage.get("total_tokens", 0)

        for chunk, vector in zip(batch, vectors, strict=True):
            metadata = chunk.get("metadata", {})
            embeddings_by_chunk_id[chunk["id"]] = {
                "chunk_id": chunk["id"],
                "content_hash": metadata.get("content_hash"),
                "section_path": metadata.get("section_path", []),
                "entity_type": metadata.get("entity_type"),
                "company": metadata.get("company"),
                "product": metadata.get("product"),
                "tags": metadata.get("tags", []),
                "embedding": vector,
            }

        partial_payload = make_output_payload(
            chunks_payload=chunks_payload,
            embeddings_by_chunk_id=embeddings_by_chunk_id,
            model=model,
            dimensions=dimensions,
            total_prompt_tokens=total_prompt_tokens,
            total_tokens=total_tokens,
            status="partial",
        )
        write_json(output_path, partial_payload)

    final_payload = make_output_payload(
        chunks_payload=chunks_payload,
        embeddings_by_chunk_id=embeddings_by_chunk_id,
        model=model,
        dimensions=dimensions,
        total_prompt_tokens=total_prompt_tokens,
        total_tokens=total_tokens,
        status="complete",
    )

    return final_payload


def make_output_payload(
    *,
    chunks_payload: dict[str, Any],
    embeddings_by_chunk_id: dict[str, dict[str, Any]],
    model: str,
    dimensions: int | None,
    total_prompt_tokens: int,
    total_tokens: int,
    status: str,
) -> dict[str, Any]:
    chunks = chunks_payload["chunks"]

    ordered_embeddings = [
        embeddings_by_chunk_id[chunk["id"]]
        for chunk in chunks
        if chunk["id"] in embeddings_by_chunk_id
    ]

    actual_dimensions = None
    if ordered_embeddings:
        actual_dimensions = len(ordered_embeddings[0]["embedding"])

    return {
        "schema_version": "1.0.0",
        "status": status,
        "generated_at": utc_now_iso(),
        "generated_from": chunks_payload.get("generated_from", "resume_chunks.json"),
        "source_schema_version": chunks_payload.get("schema_version"),
        "source_chunk_count": len(chunks),
        "embedding_count": len(ordered_embeddings),
        "embedding_model": model,
        "embedding_dimensions": actual_dimensions or dimensions,
        "embedding_input_field": "content_for_embedding",
        "usage": {
            "prompt_tokens": total_prompt_tokens,
            "total_tokens": total_tokens,
        },
        "embeddings": ordered_embeddings,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to resume_chunks.json")
    parser.add_argument("--output", required=True, help="Path to generated resume_embeddings.json")
    parser.add_argument(
        "--model", default=DEFAULT_MODEL, help=f"Embedding model. Default: {DEFAULT_MODEL}"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Batch size. Default: {DEFAULT_BATCH_SIZE}",
    )
    parser.add_argument(
        "--dimensions",
        type=int,
        default=None,
        help="Optional embedding dimensions for text-embedding-3 models",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate input and report how many chunks would be embedded",
    )
    args = parser.parse_args()

    if args.batch_size < 1:
        raise ValueError("--batch-size must be at least 1")

    input_path = Path(args.input)
    output_path = Path(args.output)

    chunks_payload = load_json(input_path)

    result = build_embeddings(
        chunks_payload=chunks_payload,
        output_path=output_path,
        model=args.model,
        batch_size=args.batch_size,
        dimensions=args.dimensions,
        dry_run=args.dry_run,
    )

    write_json(output_path, result)

    print(
        json.dumps(
            {
                "status": result.get("status"),
                "source_chunk_count": result.get("source_chunk_count"),
                "embedding_count": result.get("embedding_count"),
                "embedding_model": result.get("embedding_model", result.get("model")),
                "embedding_dimensions": result.get(
                    "embedding_dimensions", result.get("dimensions")
                ),
                "output": str(output_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
