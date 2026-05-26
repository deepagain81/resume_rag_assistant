/** Generates a random request identifier. */
export function generateRequestId(): string {
    return crypto.randomUUID();
}

/** Extracts a string message from an unknown error value. */
export function errorMessage(error: unknown): string | undefined {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return undefined;
}

/** Returns the most specific available error detail string. */
export function errorDetails(error: Error): string {
    return errorMessage(error.cause) ?? error.message;
}

/** Normalizes a question string for cache-key stability. */
export function normalizeQuestion(question: string): string {
    return question
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** Parses and validates a positive integer value. */
export function parsePositiveInteger(value: string, fieldName: string): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${fieldName}. Expected a positive number.`);
    }

    return Math.floor(parsed);
}
