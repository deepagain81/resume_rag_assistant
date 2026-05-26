export const OPENAI = {
    embedding_model: "text-embedding-3-small",
    base_url: "https://api.openai.com/v1",
    embed_endpoint: "/embeddings",
    response_endpoint: "/responses",
} as const;

export const URL_METHOD = {
    post: "POST",
    get: "GET",
    options: "OPTIONS",
} as const;

export const URL_PATH = {
    home: "/",
    query: "/api/query",
    health: "/health",
} as const;

/** Retrieval tuning defaults used by query orchestration. */
export const RETRIEVAL = {
    TOP_K: 3,
    MIN_SCORE: 0.3,
} as const;
