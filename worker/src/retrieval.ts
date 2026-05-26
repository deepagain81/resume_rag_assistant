import type {
    ChunkRecord,
    ChunksFile,
    EmbeddingRecord,
    EmbeddingsFile,
    RetrievedChunk,
} from "./types";

/* ============================================================================
 * Retrieval environment contract
 * ============================================================================
 * This module only needs access to (no need to pass whole Env):
 * - the R2 bucket where precomputed retrieval artifacts are stored
 * - the object key for chunk content
 * - the object key for chunk embeddings
 */
export interface RetrievalEnv {
    RESUME_BUCKET: R2Bucket;
    DATASET_VERSION: string;
    CHUNKS_OBJECT_KEY: string;
    EMBEDDINGS_OBJECT_KEY: string;
}

type RetrievalArtifacts = {
    embeddings: EmbeddingRecord[];
    chunkMap: Map<string, ChunkRecord>;
};

type RetrievalArtifactsCacheEntry = {
    key: string;
    value: RetrievalArtifacts;
};

type RetrievalArtifactsPendingEntry = {
    key: string;
    promise: Promise<RetrievalArtifacts>;
};

let retrievalArtifactsCache: RetrievalArtifactsCacheEntry | null = null;
let retrievalArtifactsPending: RetrievalArtifactsPendingEntry | null = null;

/* ============================================================================
 * Vector math helpers
 * ============================================================================
 */

/**
 * Computes the dot product of two vectors.
 */
function dotProduct(a: number[], b: number[]): number {
    let sum = 0;

    for (let index = 0; index < a.length; index += 1) {
        sum += a[index] * b[index];
    }

    return sum;
}

/**
 * Computes the magnitude (length) of a vector.
 */
function magnitude(vector: number[]): number {
    let sum = 0;

    for (const value of vector) {
        sum += value * value;
    }

    return Math.sqrt(sum);
}

/**
 * Computes cosine similarity between two vectors.
 * cosine similarity:
 * - Measures how similar two data points are by looking at the direction they point,
 * rather than their size or length.
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
        return 0;
    }

    const denominator = magnitude(a) * magnitude(b);

    if (denominator === 0) {
        return 0;
    }

    return dotProduct(a, b) / denominator;
}

/* ============================================================================
 * R2 JSON loading helper
 * ============================================================================
 */

/**
 * Reads a JSON object from R2 by key.
 *
 * This is generic so it can be reused for:
 * - chunk records
 * - embedding records
 * - future retrieval metadata files
 */
async function readJsonObject<T>(bucket: R2Bucket, key: string): Promise<T> {
    const object = await bucket.get(key);

    if (!object) {
        throw new Error(`R2 object not found: ${key}`);
    }

    return (await object.json()) as T;
}

/** Builds the cache key for currently configured artifact bindings. */
function getArtifactsCacheKey(env: RetrievalEnv): string {
    return [env.DATASET_VERSION, env.CHUNKS_OBJECT_KEY, env.EMBEDDINGS_OBJECT_KEY].join(":");
}

/** Loads and validates retrieval artifacts from R2. */
async function fetchArtifactsFromR2(env: RetrievalEnv, key: string): Promise<RetrievalArtifacts> {
    const [chunksPayload, embeddingsPayload] = await Promise.all([
        readJsonObject<ChunksFile>(env.RESUME_BUCKET, env.CHUNKS_OBJECT_KEY),
        readJsonObject<EmbeddingsFile>(env.RESUME_BUCKET, env.EMBEDDINGS_OBJECT_KEY),
    ]);

    validateArtifactsFile(chunksPayload, embeddingsPayload);
    const chunkMap = buildChunkMap(chunksPayload.chunks);
    const artifacts: RetrievalArtifacts = {
        embeddings: embeddingsPayload.embeddings,
        chunkMap,
    };
    retrievalArtifactsCache = { key, value: artifacts };
    return artifacts;
}

/** Validates artifact shape before retrieval scoring. */
function validateArtifactsFile(chunks: ChunksFile, embeddings: EmbeddingsFile): void {
    if (!Array.isArray(chunks.chunks)) {
        throw new Error("Invalid chunks artifact: expected `chunks` array.");
    }

    if (!Array.isArray(embeddings.embeddings)) {
        throw new Error("Invalid embeddings artifact: expected `embeddings` array.");
    }

    if (chunks.chunks.length === 0) {
        throw new Error("Invalid chunks artifact: `chunks` array is empty.");
    }

    if (embeddings.embeddings.length === 0) {
        throw new Error("Invalid embeddings artifact: `embeddings` array is empty.");
    }
}

/** Builds a chunk lookup map keyed by chunk id. */
function buildChunkMap(chunks: ChunkRecord[]): Map<string, ChunkRecord> {
    const chunkMap = new Map<string, ChunkRecord>();
    for (const chunk of chunks) {
        if (!chunk.id) {
            throw new Error("Invalid chunks artifact: chunk is missing `id`.");
        }
        if (chunkMap.has(chunk.id)) {
            throw new Error(`Invalid chunks artifact: duplicate chunk id \`${chunk.id}\`.`);
        }
        chunkMap.set(chunk.id, chunk);
    }
    return chunkMap;
}

/** Returns cached artifacts or performs a single in-flight load. */
async function loadRetrievalArtifacts(env: RetrievalEnv): Promise<RetrievalArtifacts> {
    const nextKey = getArtifactsCacheKey(env);

    if (retrievalArtifactsCache?.key === nextKey) {
        return retrievalArtifactsCache.value;
    }

    if (retrievalArtifactsPending?.key === nextKey) {
        return retrievalArtifactsPending.promise;
    }

    const retrievalArtifactsPromise = fetchArtifactsFromR2(env, nextKey);
    retrievalArtifactsPending = { key: nextKey, promise: retrievalArtifactsPromise };

    try {
        return await retrievalArtifactsPromise;
    } finally {
        if (retrievalArtifactsPending?.key === nextKey) {
            retrievalArtifactsPending = null;
        }
    }
}

/* ============================================================================
 * Main retrieval flow
 * ============================================================================
 */

/**
 * Returns top-matching chunks for a query embedding.
 *
 * @param env - retrieval bindings and artifact keys
 * @param queryEmbedding - query embedding vector
 * @param topK - max number of chunks to return
 * @param minScore - minimum similarity threshold
 */
export async function retrieveTopChunks(
    env: RetrievalEnv,
    queryEmbedding: number[],
    topK: number = 3,
    minScore: number = 0.1,
): Promise<RetrievedChunk[]> {
    const scored: RetrievedChunk[] = [];
    const artifacts = await loadRetrievalArtifacts(env);

    for (const record of artifacts.embeddings) {
        const chunk = artifacts.chunkMap.get(record.chunk_id);

        if (!chunk) {
            continue;
        }

        const score = cosineSimilarity(queryEmbedding, record.embedding);
        if (score < minScore) {
            continue;
        }

        scored.push({
            chunkId: chunk.id,
            source: chunk.metadata?.source_file ?? "canonical-profile.md",
            section: chunk.metadata?.section_path?.join(" > "),
            content: chunk.content,
            score,
        });
    }

    scored.sort((left, right) => right.score - left.score);
    return scored.slice(0, topK);
}
