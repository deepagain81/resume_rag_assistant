export interface CacheEnv {
    QUERY_CACHE: KVNamespace;
    DATASET_VERSION: string;
    CACHE_TTL_SECONDS: number;
}

function normalizeQuestion(question: string): string {
    return question.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildCacheKey(question: string, datasetVersion: string): string {
    return `query:${datasetVersion}:${normalizeQuestion(question)}`;
}

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

    await env.QUERY_CACHE.put(key, JSON.stringify(response), {
        expirationTtl: env.CACHE_TTL_SECONDS,
    });
}
