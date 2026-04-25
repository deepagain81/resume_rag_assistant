import type { RetrievedChunk } from "./types";

export function buildAnswerPrompt(question: string, retrievedChunks: RetrievedChunk[]): string {
    const context = retrievedChunks
        .map(
            (chunk, index) =>
                `[Chunk ${index + 1}] source=${chunk.source}${
                    chunk.section ? ` section=${chunk.section}` : ""
                }\n${chunk.content}`,
        )
        .join("\n\n");

    return [
        "You are a resume assistant.",
        "Answer only from the provided resume context.",
        "If the context is insufficient, say that you do not have enough information and ask them to reach out to me by email. You can also direct them to the /contact page.",
        "DO NOT make up any information that is not present in the context.",
        "",
        "User question:",
        question,
        "",
        "Resume context:",
        context,
    ].join("\n");
}
