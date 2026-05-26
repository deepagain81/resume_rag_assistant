# Resume RAG Assistant Worker

Cloudflare Worker service that powers the resume-aware chatbot API. It handles query requests, retrieves relevant context from R2-backed artifacts, and returns grounded responses using OpenAI.

This service:
- exposes API routes for health and query handling
- reads precomputed chunks and embeddings from Cloudflare R2
- generates query embeddings and answers (when relevant context is found) via OpenAI
- caches query responses in Cloudflare KV

## Module Layout

- `src/index.ts`: Worker routes and request orchestration.
- `src/response.ts`: API envelope builders, CORS headers, preflight/health/not-found helpers.
- `src/constants.ts`: App constants.
- `src/util.ts`: shared generic helpers .
- `src/cache.ts`: KV cache read/write wrapper.
- `src/retrieval.ts`: R2 artifact loading, validation, and similarity ranking.
- `src/services.ts`: OpenAI client wrapper.

## Endpoints

- `GET /`: basic runtime check
- `GET /health`: health + dataset version
- `POST /api/query`: question -> retrieval -> grounded response

## Runtime Config

Primary config lives in `worker/wrangler.jsonc`.

Important vars:
- `DATASET_VERSION`
- `CACHE_TTL_SECONDS`
- `CHUNKS_OBJECT_KEY`
- `EMBEDDINGS_OBJECT_KEY`
- `EMBEDDING_MODEL`
- `CHAT_MODEL`

Note on `CACHE_TTL_SECONDS`:
- Wrangler `vars` are text bindings at runtime.
- The Worker accepts `string` and parses it before writing to KV.
- Invalid/non-positive values fail fast.

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
    └── v3/
        ├── resume_chunks.json
        └── resume_embeddings.json
```

Use `CHUNKS_OBJECT_KEY` and `EMBEDDINGS_OBJECT_KEY` to point the Worker at the active dataset version.

## Data Contract

The Worker expects the Python pipeline artifact schema in R2:
- chunks file: top-level object with a `chunks` array (`id`, `content`, `metadata`, etc.)
- embeddings file: top-level object with an `embeddings` array (`chunk_id`, `embedding`, etc.)

Retrieval validation is fail-fast:
- missing artifact objects, invalid JSON structure, empty arrays, or duplicate chunk ids are treated as retrieval failures.
- retrieval failures return `RETRIEVAL_FAILED`.

## Response Semantics

- `QUERY_SUCCESS`: answer is grounded in at least one retrieved chunk.
- `NO_RELEVANT_CONTEXT`: query completed but no chunk passed retrieval relevance.
- Cache hits always return `cacheHit=true` and `code=QUERY_SUCCESS`.
- Unknown routes return HTTP 404 with an API envelope (`code=NOT_FOUND`, message: `Route not found.`).

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
