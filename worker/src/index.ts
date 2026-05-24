import { getCachedResponse, putCachedResponse } from "./cache";
import {
    EmbeddingError,
    GenerationError,
    InvalidRequestBodyError,
    MalformedJsonError,
    RetrievalError,
} from "./errors";
import { buildAnswerPrompt } from "./prompts";
import {
    buildEmbeddingFailedResponse,
    buildGenerationFailedResponse,
    buildInternalErrorResponse,
    buildInvalidRequestBodyResponse,
    buildMalformedJsonResponse,
    buildQuerySuccessResponse,
    buildRetrievalFailedResponse,
    jsonResponse as buildApiJsonResponse,
} from "./response";
import { retrieveTopChunks } from "./retrieval";
import { createOpenAIClient } from "./services";
import type { CacheEnv } from "./cache";
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
 * ============================================================================
 */
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const TOP_K = 3;

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

/**
 * Parses the body and validates the expected query payload shape.
 */
async function parseAndValidateQuestion(request: Request): Promise<string> {
    let body: unknown;

    try {
        body = await request.json();
    } catch (cause) {
        throw new MalformedJsonError({ cause });
    }

    // Todo - improve validation error (make specific)
    if (!isValidQueryRequest(body)) {
        throw new InvalidRequestBodyError({ field: "question" });
    }

    return body.question.trim();
}

/* ============================================================================
 * Cache helpers
 * ============================================================================
 */

/**
 * Narrows the Worker env to the cache-specific contract.
 */
function getCacheEnv(env: Env): CacheEnv {
    return {
        QUERY_CACHE: env.QUERY_CACHE,
        DATASET_VERSION: env.DATASET_VERSION,
        CACHE_TTL_SECONDS: env.CACHE_TTL_SECONDS,
    };
}

/**
 * Writes query response cache asynchronously so response latency is not blocked.
 */
function cacheResponseInBackground(
    ctx: ExecutionContext,
    cacheEnv: CacheEnv,
    question: string,
    answer: string,
): void {
    ctx.waitUntil(
        putCachedResponse(cacheEnv, question, answer).catch((cause) => {
            //console.error("Failed to write query response cache", cause);
        }),
    );
}

/* ============================================================================
 * Query workflow helpers
 * ============================================================================
 */

/**
 * Generates the query embedding and retrieves top matching chunks.
 */
async function retrieveRelevantChunks(env: Env, question: string): Promise<RetrievedChunk[]> {
    let queryEmbedding: number[];

    try {
        queryEmbedding = await getQueryEmbedding(env, question);
    } catch (cause) {
        throw new EmbeddingError({ cause });
    }

    try {
        return await retrieveTopChunks(env, queryEmbedding, TOP_K);
    } catch (cause) {
        throw new RetrievalError({ cause });
    }
}

/* ============================================================================
 * Route handlers
 * ============================================================================
 */

/**
 * Health endpoint - Useful for verifying that the Worker is live and reading config correctly.
 */
function handleHealth(env: Env): Response {
    return jsonResponse({
        status: "ok",
        datasetVersion: env.DATASET_VERSION,
    });
}

/**
 * Query endpoint - validates input, checks cache, generates a query embedding,
 * and returns a response.
 */
async function handleQuery(env: Env, request: Request, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const cacheEnv = getCacheEnv(env);
    let question = "";

    try {
        question = await parseAndValidateQuestion(request);
        const cachedResponse = await getCachedResponse(cacheEnv, question);

        if (cachedResponse) {
            return buildSuccessQueryResponse(env, {
                answer: cachedResponse,
                cacheHit: true,
                retrievedChunks: [],
                requestId,
                question,
            });
        }

        const retrievedChunks = await retrieveRelevantChunks(env, question);
        const prompt = buildAnswerPrompt(question, retrievedChunks);
        const answer = await getQueryAnswer(env, prompt);

        cacheResponseInBackground(ctx, cacheEnv, question, answer);

        return buildSuccessQueryResponse(env, {
            answer,
            cacheHit: false,
            retrievedChunks,
            requestId,
            question,
        });
    } catch (error) {
        return mapQueryErrorToResponse(error, {
            requestId,
            question,
            datasetVersion: env.DATASET_VERSION,
            model: env.CHAT_MODEL,
        });
    }
}

/* ============================================================================
 * Query embedding + generation workflow
 * ========================================================================== */

/**
 * Returns a single embedding vector for the incoming question.
 */
async function getQueryEmbedding(env: Env, question: string): Promise<number[]> {
    const client = getOpenAIClient(env);
    return client.embedQuery(question);
}

/**
 * Returns answer text from the model and translates model failures.
 */
async function getQueryAnswer(env: Env, prompt: string): Promise<string> {
    const client = getOpenAIClient(env);

    try {
        return await client.generateAnswer(prompt);
    } catch (cause) {
        throw new GenerationError({ cause });
    }
}

/* ============================================================================
 * Error mapping helpers
 * ============================================================================
 */

interface QueryErrorResponseContext {
    requestId: string;
    question?: string;
    datasetVersion: string;
    model: string;
}

function errorMessage(error: unknown): string | undefined {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return undefined;
}

function errorDetails(error: Error): string {
    return errorMessage(error.cause) ?? error.message;
}

function buildSuccessQueryResponse(
    env: Env,
    params: {
        answer: string;
        cacheHit: boolean;
        retrievedChunks: RetrievedChunk[];
        requestId: string;
        question: string;
    },
): Response {
    return buildApiJsonResponse(
        buildQuerySuccessResponse({
            answer: params.answer,
            cacheHit: params.cacheHit,
            retrievedChunks: params.retrievedChunks,
            requestId: params.requestId,
            datasetVersion: env.DATASET_VERSION,
            question: params.question,
            model: env.CHAT_MODEL,
        }),
        200,
    );
}

/**
 * Converts internal typed errors to stable API responses.
 */
function mapQueryErrorToResponse(error: unknown, context: QueryErrorResponseContext): Response {
    const errType = error instanceof Error ? error.constructor : null;

    switch (errType) {
        case MalformedJsonError:
            return buildApiJsonResponse(buildMalformedJsonResponse(context.requestId), 400);

        case InvalidRequestBodyError: {
            const typedError = error as InvalidRequestBodyError;
            return buildApiJsonResponse(
                buildInvalidRequestBodyResponse({
                    requestId: context.requestId,
                    field: typedError.field,
                    details: typedError.message,
                }),
                422,
            );
        }

        case EmbeddingError: {
            const typedError = error as EmbeddingError;
            return buildApiJsonResponse(
                buildEmbeddingFailedResponse({
                    requestId: context.requestId,
                    question: context.question,
                    details: errorDetails(typedError),
                }),
                502,
            );
        }

        case RetrievalError: {
            const typedError = error as RetrievalError;
            return buildApiJsonResponse(
                buildRetrievalFailedResponse({
                    requestId: context.requestId,
                    question: context.question,
                    datasetVersion: context.datasetVersion,
                    details: errorDetails(typedError),
                }),
                500,
            );
        }

        case GenerationError: {
            const typedError = error as GenerationError;
            return buildApiJsonResponse(
                buildGenerationFailedResponse({
                    requestId: context.requestId,
                    question: context.question,
                    datasetVersion: context.datasetVersion,
                    model: context.model,
                    details: errorDetails(typedError),
                }),
                502,
            );
        }

        default:
            return buildApiJsonResponse(
                buildInternalErrorResponse({
                    requestId: context.requestId,
                    question: context.question,
                    datasetVersion: context.datasetVersion,
                    details: errorMessage(error) ?? "An unexpected internal error occurred.",
                }),
                500,
            );
    }
}

/* ============================================================================
 * OpenAI singleton client
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
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
                return handleQuery(env, request, ctx);

            default:
                return jsonResponse({ error: "Not found" }, 404);
        }
    },
};
