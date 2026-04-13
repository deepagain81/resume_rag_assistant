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
