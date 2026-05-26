import { normalizeQuestion, parsePositiveInteger } from "./util";

export interface CacheEnv {
    QUERY_CACHE: KVNamespace;
    DATASET_VERSION: string;
    CACHE_TTL_SECONDS: string;
}

export function buildCacheKey(question: string, datasetVersion: string): string {
    return `query:${datasetVersion}:${normalizeQuestion(question)}`;
}

/** Parses and validates the configured cache TTL in seconds. */
function parseCacheTtlSeconds(value: string): number {
    return parsePositiveInteger(value, "CACHE_TTL_SECONDS");
}

/** Reads a cached answer for the given question. */
export async function getCachedResponse(env: CacheEnv, question: string): Promise<string | null> {
    const key = buildCacheKey(question, env.DATASET_VERSION);
    const cached = await env.QUERY_CACHE.get(key, "json");

    if (!cached) {
        return null;
    }

    return cached as string;
}

export async function putCachedResponse(
    env: CacheEnv,
    question: string,
    response: string,
): Promise<void> {
    const key = buildCacheKey(question, env.DATASET_VERSION);
    const ttlSeconds = parseCacheTtlSeconds(env.CACHE_TTL_SECONDS);

    await env.QUERY_CACHE.put(key, JSON.stringify(response), {
        expirationTtl: ttlSeconds,
    });
}
