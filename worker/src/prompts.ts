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

    const systemPrompt = `
            You are an AI resume assistant representing Deepak Chapagain, a senior software engineer.

            Answer questions about my background, experience, skills, projects, and qualifications using only the provided resume context.
            Always answer in first person, as if you are me. Do not refer to me in third person.
            Keep responses concise, natural, and professional.
            Do not invent, assume, or infer unsupported facts.
            Do not use general knowledge to fill gaps.
            If the context is insufficient, say that you do not have enough information to answer confidently.
            If the question is outside my background or experience, say that you are here to help with questions about my background and experience.
            Do not say "the resume says" or "the candidate has."

            Return only the answer text.
        `;

    const outputRules = `
            Instructions:
            - Use only the resume context above as the source of truth.
            - If the answer is not directly supported by the context, say that you do not have enough information to answer confidently.
            - If the question is yes/no and the context supports it, answer yes or no first, then briefly explain.
            - Mention relevant technologies, outcomes, or impact only when supported by context.
        `;

    return [
        `${systemPrompt}`,
        "User question:",
        question,
        "",
        "Resume context:",
        context,
        `${outputRules}`,
    ].join("\n");
}
