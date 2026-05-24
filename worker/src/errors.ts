export class QueryError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, { cause: options?.cause });
        this.name = this.constructor.name;
    }
}

export class MalformedJsonError extends QueryError {
    constructor(options?: { cause?: unknown }) {
        super("Malformed JSON request body.", { cause: options?.cause });
    }
}

export class InvalidRequestBodyError extends QueryError {
    readonly field: string;

    constructor(options?: { cause?: unknown; field?: string }) {
        super("Invalid request body.", { cause: options?.cause });
        this.field = options?.field ?? "question";
    }
}

export class EmbeddingError extends QueryError {
    constructor(options?: { cause?: unknown }) {
        super("Failed to generate query embedding.", { cause: options?.cause });
    }
}

export class RetrievalError extends QueryError {
    constructor(options?: { cause?: unknown }) {
        super("Failed to retrieve relevant context.", { cause: options?.cause });
    }
}

export class GenerationError extends QueryError {
    constructor(options?: { cause?: unknown }) {
        super("Failed to generate answer.", { cause: options?.cause });
    }
}
