import type {
    ApiError,
    ApiResponse,
    BuildMetaInput,
    Citation,
    QueryResponseData,
    ResponseCode,
    ResponseMeta,
    RetrievedChunk,
} from "./types";
import { generateRequestId } from "./util";

export const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

/** Builds common response metadata. */
export function buildMeta(input: BuildMetaInput = {}): ResponseMeta {
    return {
        requestId: input.requestId ?? generateRequestId(),
        timestamp: new Date().toISOString(),
        datasetVersion: input.datasetVersion,
        question: input.question,
        retrievedCount: input.retrievedCount,
        model: input.model,
    };
}

/** Builds a successful API envelope. */
export function buildSuccessResponse<T>(
    code: Extract<ResponseCode, "QUERY_SUCCESS" | "NO_RELEVANT_CONTEXT">,
    message: string,
    data: T,
    meta: ResponseMeta,
): ApiResponse<T> {
    return {
        ok: true,
        code,
        message,
        data,
        error: null,
        meta,
    };
}

/** Builds an error API envelope. */
export function buildErrorResponse(
    code: Exclude<ResponseCode, "QUERY_SUCCESS" | "NO_RELEVANT_CONTEXT">,
    message: string,
    error: ApiError,
    meta: ResponseMeta,
): ApiResponse<null> {
    return {
        ok: false,
        code,
        message,
        data: null,
        error,
        meta,
    };
}

/** Builds the standard query success response payload. */
export function buildQuerySuccessResponse(params: {
    answer: string;
    cacheHit: boolean;
    retrievedChunks: RetrievedChunk[];
    citations?: Citation[];
    requestId?: string;
    datasetVersion?: string;
    question?: string;
    model?: string;
}): ApiResponse<QueryResponseData> {
    const retrievedCount = params.retrievedChunks.length;
    const meta = buildMeta({
        requestId: params.requestId,
        datasetVersion: params.datasetVersion,
        question: params.question,
        retrievedCount,
        model: params.model,
    });

    return buildSuccessResponse(
        "QUERY_SUCCESS",
        "Query processed successfully.",
        {
            answer: params.answer,
            cacheHit: params.cacheHit,
            citations: params.citations,
        },
        meta,
    );
}

/** Builds a response envelope for queries with no relevant retrieved context. */
export function buildNoRelevantContextResponse(params: {
    requestId?: string;
    datasetVersion?: string;
    question?: string;
    model?: string;
}): ApiResponse<QueryResponseData> {
    return buildSuccessResponse(
        "NO_RELEVANT_CONTEXT",
        "No relevant context found for the question.",
        {
            answer: "I do not have enough information to provide a confident answer. Please reach out to me through [email](https://www.deepakchapagain.com/#contact), and I would be happy to discuss further.",
            cacheHit: false,
        },
        buildMeta({
            requestId: params.requestId,
            datasetVersion: params.datasetVersion,
            question: params.question,
            retrievedCount: 0,
            model: params.model,
        }),
    );
}

/** Builds a health-check response envelope. */
export function buildHealthResponse(params: {
    datasetVersion: string;
    requestId?: string;
}): ApiResponse<{ status: "ok"; datasetVersion: string }> {
    return buildSuccessResponse(
        "QUERY_SUCCESS",
        "Worker is healthy.",
        {
            status: "ok",
            datasetVersion: params.datasetVersion,
        },
        buildMeta({
            requestId: params.requestId,
            datasetVersion: params.datasetVersion,
        }),
    );
}

/** Builds a malformed JSON error response envelope. */
export function buildMalformedJsonResponse(requestId?: string): ApiResponse<null> {
    return buildErrorResponse(
        "MALFORMED_JSON",
        "Malformed JSON request body.",
        {
            type: "client_error",
            details: "The request body could not be parsed as valid JSON.",
            retryable: false,
        },
        buildMeta({ requestId }),
    );
}

/** Builds an invalid request body error response envelope. */
export function buildInvalidRequestBodyResponse(params?: {
    requestId?: string;
    field?: string;
    details?: string;
}): ApiResponse<null> {
    return buildErrorResponse(
        "INVALID_REQUEST_BODY",
        "Invalid request body.",
        {
            type: "validation_error",
            details:
                params?.details ??
                'Expected body shape: {"question":"..."} with a non-empty string.',
            field: params?.field ?? "question",
            retryable: false,
        },
        buildMeta({ requestId: params?.requestId }),
    );
}

/** Builds an embedding failure response envelope. */
export function buildEmbeddingFailedResponse(params?: {
    requestId?: string;
    question?: string;
    details?: string;
}): ApiResponse<null> {
    return buildErrorResponse(
        "EMBEDDING_FAILED",
        "Failed to generate query embedding.",
        {
            type: "upstream_error",
            details: params?.details ?? "Embedding provider request failed.",
            retryable: true,
        },
        buildMeta({
            requestId: params?.requestId,
            question: params?.question,
        }),
    );
}

/** Builds a retrieval failure response envelope. */
export function buildRetrievalFailedResponse(params?: {
    requestId?: string;
    question?: string;
    datasetVersion?: string;
    details?: string;
}): ApiResponse<null> {
    return buildErrorResponse(
        "RETRIEVAL_FAILED",
        "Failed to retrieve relevant context.",
        {
            type: "server_error",
            details: params?.details ?? "An internal retrieval step failed.",
            retryable: true,
        },
        buildMeta({
            requestId: params?.requestId,
            question: params?.question,
            datasetVersion: params?.datasetVersion,
        }),
    );
}

/** Builds a generation failure response envelope. */
export function buildGenerationFailedResponse(params?: {
    requestId?: string;
    question?: string;
    datasetVersion?: string;
    model?: string;
    details?: string;
}): ApiResponse<null> {
    return buildErrorResponse(
        "GENERATION_FAILED",
        "Failed to generate answer.",
        {
            type: "upstream_error",
            details: params?.details ?? "LLM generation request failed.",
            retryable: true,
        },
        buildMeta({
            requestId: params?.requestId,
            question: params?.question,
            datasetVersion: params?.datasetVersion,
            model: params?.model,
        }),
    );
}

/** Builds an internal error response envelope. */
export function buildInternalErrorResponse(params?: {
    requestId?: string;
    question?: string;
    datasetVersion?: string;
    details?: string;
}): ApiResponse<null> {
    return buildErrorResponse(
        "INTERNAL_ERROR",
        "Failed to process query.",
        {
            type: "server_error",
            details: params?.details ?? "An unexpected internal error occurred.",
            retryable: true,
        },
        buildMeta({
            requestId: params?.requestId,
            question: params?.question,
            datasetVersion: params?.datasetVersion,
        }),
    );
}

/** Builds a route-not-found error response envelope. */
export function buildNotFoundResponse(params?: {
    requestId?: string;
    datasetVersion?: string;
    routeKey?: string;
}): ApiResponse<null> {
    return buildErrorResponse(
        "NOT_FOUND",
        "Route not found.",
        {
            type: "client_error",
            details: `Route not found: ${params?.routeKey}`,
            retryable: false,
        },
        buildMeta({
            requestId: params?.requestId,
            datasetVersion: params?.datasetVersion,
        }),
    );
}

/** Builds the CORS preflight response. */
export function buildPreflightResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

/** Serializes an API envelope with standard JSON/CORS headers. */
export function jsonResponse<T>(body: ApiResponse<T>, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            ...CORS_HEADERS,
        },
    });
}
