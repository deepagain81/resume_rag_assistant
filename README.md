# Resume RAG Assistant

Python ingestion pipeline for a resume-aware RAG dataset.

It converts a canonical Markdown profile into:
- `data/resume_chunks.json` (semantic chunks + metadata)
- `data/resume_embeddings.json` (OpenAI embeddings + retrieval metadata)

The Cloudflare Worker runtime is in `worker/`. This README keeps worker coverage high-level only.

## Worker at a Glance (High-Level)

The `worker/` app is the runtime API layer for the chatbot.

- Runtime: Cloudflare Workers (TypeScript)
- Purpose: receives user questions and returns resume-grounded answers
- Retrieval data source: `dataset/DATASET_VERSION/resume_chunks.json` and `dataset/DATASET_VERSION/resume_embeddings.json` in Cloudflare R2
- Caching: query responses are cached in Cloudflare KV by normalized question + dataset version

Use this Python pipeline to generate the data artifacts consumed by the Worker.
For worker setup, deployment, endpoint behavior, and runtime configuration, see `worker/README.md`.

## What This Repo Includes

- `data/canonical-profile.md`: source-of-truth resume knowledge base
- `scripts/build_chunks.py`: Markdown -> chunked JSON artifact
- `scripts/build_embeddings.py`: chunks -> embeddings JSON artifact (resumable)
- `src/app/schemas.py`: typed schemas for generated artifacts
- `src/app/config.py`: shared file paths and defaults
- `tests/test_main.py`: baseline config tests

## Project Structure

```text
resume-rag-assistant/
├── data/
│   ├── canonical-profile.md
│   ├── resume_chunks.json
│   └── resume_embeddings.json
├── scripts/
│   ├── build_chunks.py
│   └── build_embeddings.py
├── src/
│   └── app/
│       ├── __init__.py
│       ├── config.py
│       ├── main.py
│       └── schemas.py
├── tests/
│   └── test_main.py
├── worker/
│   ├── README.md
│   ├── src/
│   ├── wrangler.jsonc
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── makefile
├── pyproject.toml
├── requirements.txt
└── README.md
```

## Requirements

- Python `3.12.x` (`>=3.12,<3.13`)
- `OPENAI_API_KEY` for embedding generation (non-dry-run)
- Optional: Wrangler CLI for R2 upload targets in `makefile`

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
```
Install dependencies:
```bash
make i
```
which runs:
```bash
python -m pip install -r requirements.txt
```

Optional:

```bash
pre-commit install
```

## Ingestion Flow

```text
data/canonical-profile.md
  -> scripts/build_chunks.py
  -> data/resume_chunks.json
  -> scripts/build_embeddings.py
  -> data/resume_embeddings.json
```

### 1) Build Chunks

```bash
make chunks
```

Equivalent command:

```bash
python scripts/build_chunks.py \
  --input data/canonical-profile.md \
  --output data/resume_chunks.json
```

### 2) Dry Run Embeddings (No OpenAI Call)

```bash
make rag-dry-run
```

This validates `resume_chunks.json` and reports reusable vs. pending embeddings.

### 3) Build Embeddings

```bash
export OPENAI_API_KEY="your_api_key"
make embeddings
```

Equivalent command:

```bash
python scripts/build_embeddings.py \
  --input data/resume_chunks.json \
  --output data/resume_embeddings.json \
  --model text-embedding-3-small
```

Optional flags:

```bash
python scripts/build_embeddings.py \
  --input data/resume_chunks.json \
  --output data/resume_embeddings.json \
  --model text-embedding-3-small \
  --batch-size 64 \
  --dimensions 1536 \
  --dry-run
```

### 4) Full Pipeline

```bash
make rag-build
```

## Artifact Notes

`data/resume_chunks.json` includes:
- `schema_version`
- `chunking_strategy`
- `source_metadata`
- `chunks[]` with `id`, `content`, `content_for_embedding`, `metadata`

`data/resume_embeddings.json` includes:
- `status` (`dry_run`, `partial`, `complete`)
- model + dimensions
- usage tokens
- `embeddings[]` keyed by `chunk_id`

`build_embeddings.py` is resumable:
- If an output file already exists, embeddings are reused when `content_hash` is unchanged.
- Partial output is written after each batch for recovery.

## Quality Commands

```bash
make test
make lc
make format
make lf
make check
make clean
```

`make check` runs:
- `ruff check .`
- `black --check .`
- `pytest`

Run mypy directly:

```bash
mypy
```

## Environment Variables

Top-level `.env.example`:

```bash
OPENAI_API_KEY=openai_api_key
EMBEDDING_MODEL=text-embedding-model-name
R2_BUCKET_NAME=bucket-name
CHUNKS_OBJECT_KEY=dataset-chunk-key
EMBEDDINGS_OBJECT_KEY=dataset-embedding-key
```

Only `OPENAI_API_KEY` is required for local embedding generation in this Python pipeline.
Worker-specific env/runtime meaning is documented in `worker/README.md`.

## Optional R2 Upload Commands

The make targets below use Wrangler and expect a configured Cloudflare environment:

```bash
make upload-chunks
make upload-embeddings
```

## Commands

From project root:

```bash
# Install Python deps
make i

# Build pipeline end-to-end (local artifacts)
make rag-build

# Validate ingestion without OpenAI API call
make rag-dry-run

# Local quality checks
make lc
make check

# Auto-fix lint + format
make lf

# Upload generated artifacts to R2
make upload-chunks
make upload-embeddings
```
