export interface QueryRequest {
    question: string;
}

export interface RetrievedChunk {
    chunkId: string;
    source: string;
    section?: string;
    content: string;
    score: number;
}
export interface ChunkRecord {
    chunk_id: string;
    source: string;
    section?: string;
    content: string;
}

export interface EmbeddingRecord {
    chunk_id: string;
    embedding: number[];
}

export interface ApiResponse<T = unknown> {
    ok: boolean;
    code: ResponseCode;
    message: string;
    data: T | null;
    error: ApiError | null;
    meta: ResponseMeta;
}

export type ResponseCode =
    | "QUERY_SUCCESS"
    | "NO_RELEVANT_CONTEXT"
    | "MALFORMED_JSON"
    | "INVALID_REQUEST_BODY"
    | "EMBEDDING_FAILED"
    | "RETRIEVAL_FAILED"
    | "GENERATION_FAILED"
    | "INTERNAL_ERROR";

export interface ApiError {
    type: ErrorType;
    details: string;
    field?: string;
    retryable: boolean;
}

export type ErrorType = "client_error" | "validation_error" | "upstream_error" | "server_error";

export interface ResponseMeta {
    requestId: string;
    timestamp: string;
    datasetVersion?: string;
    question?: string;
    retrievedCount?: number;
    model?: string;
}

export interface Citation {
    chunkId: string;
    text: string;
    score?: number;
}

export interface QueryResponseData {
    answer: string;
    source: "retrieval_stub" | "llm_generated";
    citations?: Citation[];
}

export interface BuildMetaInput {
    requestId?: string;
    datasetVersion?: string;
    question?: string;
    retrievedCount?: number;
    model?: string;
}
