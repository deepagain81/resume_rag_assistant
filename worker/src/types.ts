export interface QueryRequest {
    question: string;
}

export interface QueryResponse {
    answer: string;
    source: string;
    datasetVersion: string;
}

export interface ErrorResponse {
    error: string;
}
