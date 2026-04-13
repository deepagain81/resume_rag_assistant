import { createOpenAIClient } from "./services";
import type { QueryRequest, QueryResponse } from "./types";

/* ============================================================================
 * Worker environment bindings
 * ============================================================================
 * These values are injected by Cloudflare at runtime from Wrangler config,
 * KV, R2, and secrets.
 */
export interface Env {
    QUERY_CACHE: KVNamespace;
    RESUME_BUCKET: R2Bucket;
    OPENAI_API_KEY: string;
    DATASET_VERSION: string;
    CHUNKS_OBJECT_KEY: string;
    EMBEDDINGS_OBJECT_KEY: string;
    EMBEDDING_MODEL: string;
    CHAT_MODEL: string;
}

/* ============================================================================
 * HTTP / CORS configuration
 * ============================================================================.
 */
const corsHeaders = {
    "Access-Control-Allow-Origin": "https://www.deepakchapagain.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* ============================================================================
 * Response helpers
 * ============================================================================
 * These small helpers standardize API responses across the Worker.
 */

/**
 * Returns a JSON response with the standard content type and CORS headers.
 */
function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            ...corsHeaders,
        },
    });
}

/**
 * Returns a successful empty response for CORS preflight requests.
 */
function preflightResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

/* ============================================================================
 * Request parsing and validation
 * ============================================================================
 */

/**
 * Parses the incoming request body as JSON.
 */
async function parseJsonBody(request: Request): Promise<unknown> {
    return request.json();
}

/**
 * Runtime validation for the /api/query request body.
 * Ensures the payload contains a non-empty "question" string.
 */
function isValidQueryRequest(value: unknown): value is QueryRequest {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const maybeQuestion = (value as Record<string, unknown>).question;
    return typeof maybeQuestion === "string" && maybeQuestion.trim().length > 0;
}

/* ============================================================================
 * Route handlers
 * ============================================================================
 */

/**
 * Health endpoint - Useful for verifying that the Worker is live and reading config correctly.
 */
async function handleHealth(env: Env): Promise<Response> {
    return jsonResponse({
        status: "ok",
        datasetVersion: env.DATASET_VERSION,
    });
}

/**
 * Query endpoint - validates input, checks cache, generates a query embedding,
 * and returns a response.
 */
async function handleQuery(env: Env, request: Request): Promise<Response> {
    const parsedRequest = await parseAndValidateQueryRequest(request);

    if (!parsedRequest.ok) {
        return jsonResponse({ error: parsedRequest.error }, parsedRequest.status);
    }

    try {
        const result = await getQueryEmbedding(env, parsedRequest.question);

        return jsonResponse(result, 200);
    } catch (error) {
        return jsonResponse(
            {
                error: buildQueryErrMsg(error),
            },
            500,
        );
    }
}

/* ============================================================================
 * Query request parsing and validation
 * ========================================================================== */

interface QueryParseSuccess {
    ok: true;
    question: string;
}

interface QueryParseFailure {
    ok: false;
    status: 400 | 422;
    error: string;
}

type QueryParseResult = QueryParseSuccess | QueryParseFailure;

async function parseAndValidateQueryRequest(request: Request): Promise<QueryParseResult> {
    let body: unknown;

    try {
        body = await parseJsonBody(request);
    } catch {
        return {
            ok: false,
            status: 400,
            error: "Malformed JSON request body.",
        };
    }

    if (!isValidQueryRequest(body)) {
        return {
            ok: false,
            status: 422,
            error: 'Invalid request body. Expected: {"question":"..."} with a non-empty string.',
        };
    }

    return {
        ok: true,
        question: body.question.trim(),
    };
}

/* ============================================================================
 * Query embedding workflow
 * ========================================================================== */

interface QueryEmbeddingResponse extends QueryResponse {
    embeddingDimensions: number;
}

async function getQueryEmbedding(env: Env, question: string): Promise<QueryEmbeddingResponse> {
    const client = createOpenAIClientFromEnv(env);
    const embedding = await client.embedQuery(question);

    return {
        answer: `${embedding}`,
        source: env.EMBEDDING_MODEL,
        datasetVersion: env.DATASET_VERSION,
        embeddingDimensions: embedding.length,
    };
}

/* ============================================================================
 * OpenAI client creation
 * ========================================================================== */

function createOpenAIClientFromEnv(env: Env) {
    return createOpenAIClient({
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        EMBEDDING_MODEL: env.EMBEDDING_MODEL,
        CHAT_MODEL: env.CHAT_MODEL,
    });
}

/* ============================================================================
 * Error normalization
 * ========================================================================== */

function buildQueryErrMsg(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unexpected error while generating query embedding.";
}

/* ============================================================================
 * Main Worker entrypoint
 * ============================================================================
 * Handles:
 * - CORS preflight
 * - route dispatch
 * - fallback 404
 */
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === "OPTIONS") {
            return preflightResponse();
        }

        const url = new URL(request.url);
        const routeKey = `${request.method} ${url.pathname}`;

        switch (routeKey) {
            case "GET /":
                return new Response("Great! Worker is running...", {
                    headers: corsHeaders,
                });

            case "GET /health":
                return handleHealth(env);

            case "POST /api/query":
                return handleQuery(env, request);

            default:
                return jsonResponse({ error: "Not found" }, 404);
        }
    },
};
