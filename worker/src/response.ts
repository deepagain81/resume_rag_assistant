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

function generateRequestId(): string {
    return crypto.randomUUID();
}

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
        retrievedCount > 0 ? "QUERY_SUCCESS" : "NO_RELEVANT_CONTEXT",
        retrievedCount > 0
            ? "Query processed successfully."
            : "Query processed successfully, but no relevant resume context was found.",
        {
            answer: params.answer,
            cacheHit: params.cacheHit,
            citations: params.citations,
        },
        meta,
    );
}

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

export function jsonResponse<T>(body: ApiResponse<T>, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
