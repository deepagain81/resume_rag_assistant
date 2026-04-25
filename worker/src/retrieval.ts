import type { ChunkRecord, EmbeddingRecord, RetrievedChunk } from "./types";

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
    CHUNKS_OBJECT_KEY: string;
    EMBEDDINGS_OBJECT_KEY: string;
}

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

/* ============================================================================
 * Main retrieval flow
 * ============================================================================
 * Steps:
 * 1. Load chunk content from R2
 * 2. Load chunk embeddings from R2
 * 3. Build a lookup map from chunk_id -> chunk record
 * 4. Compare the query embedding against each stored chunk embedding
 * 5. Score all chunks using cosine similarity
 * 6. Sort by best score first
 * 7. Return the top K chunks
 */

/**
 * Retrieves the top matching chunks for a given query embedding.
 *
 * @param env - retrieval-specific environment bindings and object keys
 * @param queryEmbedding - embedding vector generated from the user's question
 * @param topK - maximum number of chunks to return
 */
export async function retrieveTopChunks(
    env: RetrievalEnv,
    queryEmbedding: number[],
    topK = 3,
): Promise<RetrievedChunk[]> {
    const scored: RetrievedChunk[] = [];
    // Load the actual chunk content records from R2.
    const chunks = await readJsonObject<ChunkRecord[]>(env.RESUME_BUCKET, env.CHUNKS_OBJECT_KEY);

    // Load the precomputed embedding records from R2.
    const embeddings = await readJsonObject<EmbeddingRecord[]>(
        env.RESUME_BUCKET,
        env.EMBEDDINGS_OBJECT_KEY,
    );

    // Build a fast lookup map so we can get chunk content by chunk_id
    // while iterating over the embedding records.
    const chunkMap = new Map<string, ChunkRecord>();

    for (const chunk of chunks) {
        chunkMap.set(chunk.chunk_id, chunk);
    }

    // Compare the query embedding to every stored chunk embedding.
    for (const record of embeddings) {
        const chunk = chunkMap.get(record.chunk_id);

        // This protects us from inconsistent or partial data files.
        if (!chunk) {
            continue;
        }

        // Compute semantic similarity between:
        // - the user's query embedding
        // - the stored chunk embedding
        const score = cosineSimilarity(queryEmbedding, record.embedding);

        // Store the chunk plus its similarity score.
        scored.push({
            chunkId: chunk.chunk_id,
            source: chunk.source,
            section: chunk.section,
            content: chunk.content,
            score,
        });
    }

    // Sort the scored chunks.
    scored.sort((left, right) => right.score - left.score);

    // Return only the top K results.
    return scored.slice(0, topK);
}
