import { getCachedResponse, putCachedResponse } from "./cache";
import { buildAnswerPrompt } from "./prompts";
import {
    buildInternalErrorResponse,
    buildInvalidRequestBodyResponse,
    buildMalformedJsonResponse,
    buildQuerySuccessResponse,
    jsonResponse as buildApiJsonResponse,
} from "./response";
import { retrieveTopChunks } from "./retrieval";
import { createOpenAIClient } from "./services";
import type { QueryRequest, RetrievedChunk } from "./types";

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
    CACHE_TTL_SECONDS: number;
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
    const requestId = crypto.randomUUID();
    let body: unknown;
    let retrievedChunks: RetrievedChunk[] = [];

    try {
        body = await parseJsonBody(request);
    } catch {
        return buildApiJsonResponse(buildMalformedJsonResponse(requestId), 400);
    }

    if (!isValidQueryRequest(body)) {
        return buildApiJsonResponse(buildInvalidRequestBodyResponse({ requestId }), 422);
    }
    const question = body.question.trim();
    const cachedResponse = await getCachedResponse(
        {
            QUERY_CACHE: env.QUERY_CACHE,
            DATASET_VERSION: env.DATASET_VERSION,
            CACHE_TTL_SECONDS: env.CACHE_TTL_SECONDS,
        },
        question,
    );
    if (cachedResponse) {
        return buildApiJsonResponse(
            buildQuerySuccessResponse({
                answer: cachedResponse,
                cacheHit: true,
                retrievedChunks,
                requestId,
                datasetVersion: env.DATASET_VERSION,
                question,
                model: env.CHAT_MODEL,
            }),
            200,
        );
    }
    try {
        const queryEmbedding = await getQueryEmbedding(env, question);
        retrievedChunks = await retrieveTopChunks(env, queryEmbedding.embedding, 3);
    } catch (_error) {
        return buildApiJsonResponse(
            buildInternalErrorResponse({
                requestId,
                question,
                datasetVersion: env.DATASET_VERSION,
            }),
            500,
        );
    }

    try {
        const prompt = buildAnswerPrompt(question, retrievedChunks);
        const answer = await getQueryAnswer(env, prompt);
        await putCachedResponse(env, question, answer);

        return buildApiJsonResponse(
            buildQuerySuccessResponse({
                answer,
                cacheHit: false,
                retrievedChunks,
                requestId,
                datasetVersion: env.DATASET_VERSION,
                question,
                model: env.CHAT_MODEL,
            }),
            200,
        );
    } catch (_error) {
        return buildApiJsonResponse(
            buildInternalErrorResponse({
                requestId,
                question,
                datasetVersion: env.DATASET_VERSION,
            }),
            500,
        );
    }
}

/* ============================================================================
 * Query embedding workflow
 * ========================================================================== */

interface QueryEmbeddingResponse {
    embeddingDimensions: number;
    embedding: number[];
}

async function getQueryEmbedding(env: Env, question: string): Promise<QueryEmbeddingResponse> {
    const client = getOpenAIClient(env);
    const embedding = await client.embedQuery(question);

    return {
        embedding: embedding,
        embeddingDimensions: embedding.length,
    };
}

async function getQueryAnswer(env: Env, prompt: string): Promise<string> {
    const client = getOpenAIClient(env);
    return client.generateAnswer(prompt);
}

/* ============================================================================
 * OpenAI Singleton client
 * ========================================================================== */

let openAIClient: ReturnType<typeof createOpenAIClient> | null = null;
let openAIClientKey: string | null = null;

function getOpenAIClient(env: Env): ReturnType<typeof createOpenAIClient> {
    const nextKey = `${env.OPENAI_API_KEY}:${env.EMBEDDING_MODEL}:${env.CHAT_MODEL}`;

    if (!openAIClient || openAIClientKey !== nextKey) {
        openAIClient = createOpenAIClient({
            OPENAI_API_KEY: env.OPENAI_API_KEY,
            EMBEDDING_MODEL: env.EMBEDDING_MODEL,
            CHAT_MODEL: env.CHAT_MODEL,
        });
        openAIClientKey = nextKey;
    }

    return openAIClient;
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
