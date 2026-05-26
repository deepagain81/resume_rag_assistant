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
    CORS_HEADERS,
    buildPreflightResponse,
    buildEmbeddingFailedResponse,
    buildGenerationFailedResponse,
    buildInternalErrorResponse,
    buildInvalidRequestBodyResponse,
    buildHealthResponse,
    buildMalformedJsonResponse,
    buildNoRelevantContextResponse,
    buildNotFoundResponse,
    buildQuerySuccessResponse,
    buildRetrievalFailedResponse,
    jsonResponse as buildApiJsonResponse,
} from "./response";
import { RETRIEVAL, URL_METHOD, URL_PATH } from "./constants";
import { retrieveTopChunks } from "./retrieval";
import { createOpenAIClient } from "./services";
import { errorDetails, errorMessage, generateRequestId } from "./util";
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
    CACHE_TTL_SECONDS: string;
    CHUNKS_OBJECT_KEY: string;
    EMBEDDINGS_OBJECT_KEY: string;
    EMBEDDING_MODEL: string;
    CHAT_MODEL: string;
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
        putCachedResponse(cacheEnv, question, answer).catch((_cause) => {
            // log when cache write fails.
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
        const retrievedChunks = await retrieveTopChunks(
            env,
            queryEmbedding,
            RETRIEVAL.TOP_K,
            RETRIEVAL.MIN_SCORE,
        );

        if (retrievedChunks.length === 0) {
            throw new RetrievalError({ noRelevantContext: true });
        }

        return retrievedChunks;
    } catch (cause) {
        if (cause instanceof RetrievalError) {
            throw cause;
        }
        throw new RetrievalError({ cause });
    }
}

/* ============================================================================
 * Route handlers
 * ============================================================================
 */

/** Handles the root route response. */
function handleRoot(): Response {
    return new Response("Great! Worker is running...", {
        headers: CORS_HEADERS,
    });
}

/**
 * Health endpoint - Useful for verifying that the Worker is live and reading config correctly.
 */
function handleHealth(env: Env): Response {
    return buildApiJsonResponse(buildHealthResponse({ datasetVersion: env.DATASET_VERSION }), 200);
}

/** Builds a not-found response for unknown routes. */
function handleNotFound(env: Env, routeKey: string): Response {
    return buildApiJsonResponse(
        buildNotFoundResponse({
            datasetVersion: env.DATASET_VERSION,
            routeKey,
        }),
        404,
    );
}

/**
 * Query endpoint - validates input, checks cache, generates a query embedding,
 * and returns a response.
 */
async function handleQuery(env: Env, request: Request, ctx: ExecutionContext): Promise<Response> {
    const requestId = generateRequestId();
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

/** Wraps query success payload into an HTTP JSON response. */
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
            if (typedError.noRelevantContext) {
                return buildApiJsonResponse(
                    buildNoRelevantContextResponse({
                        requestId: context.requestId,
                        question: context.question,
                        datasetVersion: context.datasetVersion,
                        model: context.model,
                    }),
                    200,
                );
            }
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

/** Returns a memoized OpenAI client for the current model/env settings. */
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
        if (request.method === URL_METHOD.options) {
            return buildPreflightResponse();
        }

        const url = new URL(request.url);
        const routeKey = `${request.method} ${url.pathname}`;

        switch (routeKey) {
            case `${URL_METHOD.get} ${URL_PATH.home}`:
                return handleRoot();

            case `${URL_METHOD.get} ${URL_PATH.health}`:
                return handleHealth(env);

            case `${URL_METHOD.post} ${URL_PATH.query}`:
                return handleQuery(env, request, ctx);

            default:
                return handleNotFound(env, routeKey);
        }
    },
};
