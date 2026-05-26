/** Base query error carrying an optional cause. */
export class QueryError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, { cause: options?.cause });
        this.name = this.constructor.name;
    }
}

/** Error thrown when request JSON cannot be parsed. */
export class MalformedJsonError extends QueryError {
    constructor(options?: { cause?: unknown }) {
        super("Malformed JSON request body.", { cause: options?.cause });
    }
}

/** Error thrown when request body validation fails. */
export class InvalidRequestBodyError extends QueryError {
    readonly field: string;

    constructor(options?: { cause?: unknown; field?: string }) {
        super("Invalid request body.", { cause: options?.cause });
        this.field = options?.field ?? "question";
    }
}

/** Error thrown when query embedding generation fails. */
export class EmbeddingError extends QueryError {
    constructor(options?: { cause?: unknown }) {
        super("Failed to generate query embedding.", { cause: options?.cause });
    }
}

/** Error thrown when retrieval processing fails. */
export class RetrievalError extends QueryError {
    readonly noRelevantContext: boolean;

    constructor(options?: { cause?: unknown; noRelevantContext?: boolean }) {
        const noRelevantContext = options?.noRelevantContext ?? false;
        super(
            noRelevantContext
                ? "No relevant context found for the question."
                : "Failed to retrieve relevant context.",
            { cause: options?.cause },
        );
        this.noRelevantContext = noRelevantContext;
    }
}

/** Error thrown when answer generation fails. */
export class GenerationError extends QueryError {
    constructor(options?: { cause?: unknown }) {
        super("Failed to generate answer.", { cause: options?.cause });
    }
}
