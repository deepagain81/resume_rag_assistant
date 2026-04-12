import type { ErrorResponse, QueryRequest } from "./types";

export interface Env {
    QUERY_CACHE: KVNamespace;
    RESUME_BUCKET: R2Bucket;
    OPENAI_API_KEY: string;
    DATASET_VERSION: string;
    CHUNKS_OBJECT_KEY: string;
    EMBEDDINGS_OBJECT_KEY: string;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "https://www.deepakchapagain.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            ...corsHeaders,
        },
    });
}

function preflightResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

async function handleHealth(env: Env): Promise<Response> {
    return jsonResponse({
        status: "ok",
        datasetVersion: env.DATASET_VERSION,
    });
}

async function handleQuery(env: Env, request: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await parseJsonBody(request);
    } catch {
        const error: ErrorResponse = {
            error: "Malformed JSON request body.",
        };
        return jsonResponse(error, 400);
    }
    if (!isValidQueryRequest(body)) {
        const error: ErrorResponse = {
            error: 'Invalid request body. Expected: {"question":"..."} with a non-empty string.',
        };
        return jsonResponse(error, 422);
    }

    const payload = body as QueryRequest;
    return jsonResponse({
        answer: `Worker returned: ${payload.question.trim()}`,
        source: "stub",
        datasetVersion: env.DATASET_VERSION,
    });
}

async function parseJsonBody(request: Request): Promise<unknown> {
    return request.json();
}

function isValidQueryRequest(value: unknown): value is QueryRequest {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const maybeQuestion = (value as Record<string, unknown>).question;
    return typeof maybeQuestion === "string" && maybeQuestion.trim().length > 0;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === "OPTIONS") {
            return preflightResponse();
        }
        const url = new URL(request.url);

        switch (`${request.method}_${url.pathname}`) {
            case "GET_/":
                return new Response("Resume RAG Assistant Worker is running.");

            case "OPTIONS_/api/query":
                return new Response(null, { status: 204 });

            case "GET_/health":
                return handleHealth(env);

            case "POST_/api/query":
                return handleQuery(env, request);

            default:
                return jsonResponse({ error: "Not found" }, 404);
        }
    },
};
