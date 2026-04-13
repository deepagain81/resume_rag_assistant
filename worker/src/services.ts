import { OPENAI, URL_METHOD } from "./constants";

/* ============================================================================
 * Environment and client config
 * ========================================================================== */

export interface OpenAIEnv {
    OPENAI_API_KEY: string;
    EMBEDDING_MODEL: string;
    CHAT_MODEL: string;
}

export interface OpenAIClientConfig {
    apiKey: string;
    embeddingModel: string;
    chatModel: string;
    baseUrl?: string;
}

/* ============================================================================
 * Embeddings API types
 * ========================================================================== */

interface EmbeddingItem {
    embedding: number[];
    index: number;
    object: string;
}

interface EmbeddingApiResponse {
    data: EmbeddingItem[];
    model: string;
    object: string;
}

interface EmbeddingRequestBody {
    model: string;
    input: string | string[];
    encoding_format: string;
}

interface OpenAIErrBody {
    error?: {
        message?: string;
        code?: string | null;
    };
    status?: number;
}

/* ============================================================================
 * Responses API types
 * ========================================================================== */

interface GenerateResponseRequestBody {
    model: string;
    input: string;
}

interface GenerateResponseApiResponse {
    output_text?: string;
}

/* ============================================================================
 * Factory
 * ========================================================================== */

export function createOpenAIClient(env: OpenAIEnv): OpenAIClient {
    return new OpenAIClient({
        apiKey: env.OPENAI_API_KEY,
        embeddingModel: env.EMBEDDING_MODEL,
        chatModel: env.CHAT_MODEL,
    });
}

/* ============================================================================
 * OpenAI client
 * ========================================================================== */

export class OpenAIClient {
    private readonly apiKey: string;
    private readonly embeddingModel: string;
    private readonly chatModel: string;
    private readonly baseUrl: string;

    constructor(config: OpenAIClientConfig) {
        this.apiKey = config.apiKey;
        this.embeddingModel = config.embeddingModel;
        this.chatModel = config.chatModel;
        this.baseUrl = config.baseUrl ?? OPENAI.base_url;
    }

    /**
     * Generates a single embedding vector for a user query.
     */
    async embedQuery(question: string): Promise<number[]> {
        const normalizedQuestion = question.trim().replace("\n", " ");
        if (!normalizedQuestion) {
            throw new Error("Question must not be empty.");
        }

        const response = await this.requestJson<EmbeddingRequestBody, EmbeddingApiResponse>(
            OPENAI.embed_endpoint,
            {
                model: this.embeddingModel,
                input: normalizedQuestion,
                encoding_format: "float",
            },
        );

        return this.extractSingleEmbedding(response);
    }

    /**
     * Generates a text response from the LLM.
     */
    async generateResponse(prompt: string): Promise<string> {
        const normalizedPrompt = prompt.trim();

        if (!normalizedPrompt) {
            throw new Error("Prompt must not be empty.");
        }

        const response = await this.requestJson<
            GenerateResponseRequestBody,
            GenerateResponseApiResponse
        >(OPENAI.response_endpoint, {
            model: this.chatModel,
            input: normalizedPrompt,
        });

        const outputText = response.output_text?.trim();

        if (!outputText) {
            throw new Error("OpenAI response did not contain valid output text.");
        }

        return outputText;
    }

    /* --------------------------------------------------------------------------
     * Private helpers: generic HTTP layer
     * ------------------------------------------------------------------------ */

    /**
     * Generic JSON request helper for OpenAI endpoints.
     * Keeps request creation, headers, parsing, and error handling in one place.
     */
    private async requestJson<TRequest, TResponse>(
        endpoint: string,
        body: TRequest,
    ): Promise<TResponse> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: URL_METHOD.post,
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(await this.buildRequestError(response));
        }

        return (await response.json()) as TResponse;
    }

    /**
     * Standard headers required for requests.
     */
    private buildHeaders(): HeadersInit {
        return {
            "content-type": "application/json",
            authorization: `Bearer ${this.apiKey}`,
        };
    }

    /* --------------------------------------------------------------------------
     * Private helpers: response parsing and validation
     * ------------------------------------------------------------------------ */

    /**
     * Extracts and validates the first embedding vector.
     */
    private extractSingleEmbedding(response: EmbeddingApiResponse): number[] {
        const embedding = response.data?.[0]?.embedding;

        if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error("Invalid embedding vector.");
        }

        return embedding;
    }

    /**
     * Builds a readable error message from a failed response.
     */
    private async buildRequestError(response: Response): Promise<string> {
        const errorText = await response.text();
        const parsed = JSON.parse(errorText) as OpenAIErrBody;
        const status = `${response.status} ${response.statusText}`;
        const errCode = parsed.error?.code || "Unknown code";

        return `OpenAI request failed. status=${status} msg=${errCode}`;
    }
}
