# Resume RAG Assistant Worker

Cloudflare Worker service that powers the resume-aware chatbot API. It handles query requests, retrieves relevant context from R2-backed artifacts, and returns grounded responses using OpenAI.

This service:
- exposes API routes for health and query handling
- reads precomputed chunks and embeddings from Cloudflare R2
- generates query embeddings and answers via OpenAI
- caches query responses in Cloudflare KV

## Endpoints

- `GET /`: basic runtime check
- `GET /health`: health + dataset version
- `POST /api/query`: question -> retrieval -> grounded response

## Runtime Config

Primary config lives in `worker/wrangler.jsonc`.

Important vars:
- `DATASET_VERSION`
- `CHUNKS_OBJECT_KEY`
- `EMBEDDINGS_OBJECT_KEY`
- `EMBEDDING_MODEL`
- `CHAT_MODEL`

Current defaults in `wrangler.jsonc`:
- `DATASET_VERSION=v2`
- `CHUNKS_OBJECT_KEY=dataset/v2/resume_chunks.json`
- `EMBEDDINGS_OBJECT_KEY=dataset/v2/resume_embeddings.json`
- `EMBEDDING_MODEL=text-embedding-3-small`
- `CHAT_MODEL=gpt-4o-mini`

## R2 Dataset Layout

```text
resume-rag-assistant/
└── dataset/
    ├── v1/
    │   ├── resume_chunks.json
    │   └── resume_embeddings.json
    ├── v2/
    │   ├── resume_chunks.json
    │   └── resume_embeddings.json
    └── latest/
        ├── resume_chunks.json
        └── resume_embeddings.json
```

Use `CHUNKS_OBJECT_KEY` and `EMBEDDINGS_OBJECT_KEY` to point the Worker at the active dataset version.

## Data Contract

The Worker expects the Python pipeline artifact schema in R2:
- chunks file: top-level object with a `chunks` array (`id`, `content`, `metadata`, etc.)
- embeddings file: top-level object with an `embeddings` array (`chunk_id`, `embedding`, etc.)

## Local Dev

From `worker/`:

```bash
npm install
npm run dev
```

## Worker Commands

From `worker/`:

```bash
# Install dependencies
npm install

# Generate/update Worker types (alias)
npm run gt

# Local development
npm run dev

# Lint + type + format checks (alias)
npm run lc

# Auto-fix lint + format (alias)
npm run lf

# Deploy to Cloudflare Workers
npm run deploy
```
