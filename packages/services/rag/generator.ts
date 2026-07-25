import OpenAI from "openai";
import { env } from "../env";
import { logger } from "@repo/logger";
import { AssembledContext } from "./context-builder";

const openai = new OpenAI({
  baseURL: env.OPENAI_API_BASE,
  apiKey: env.OPENAI_API_KEY,
});

export interface CitationPayload {
  index: number;
  chunkId: string;
  sourceId: string;
  displayLabel: string;
  score: number;
  sourceName: string;
  excerpt: string;
  startSeconds: number | null;
  pageNumber: number | null;
}

export interface GenerationResult {
  answer: string;
  citations: CitationPayload[];
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export class Generator {
  /**
   * Generates the final answer using the assembled context and chat history.
   * Parses [Source N] markers to map back to actual citations.
   */
  async generate(
    query: string,
    context: AssembledContext,
    chatHistory: { role: "user" | "assistant"; content: string }[],
    expectedLength: "short" | "medium" | "long" = "medium",
    projectContext: string = ""
  ): Promise<GenerationResult> {
    const lengthInstruction = {
      short: "Keep your answer brief, concise, and to the point (1-3 sentences).",
      medium: "Provide a balanced, informative answer (1-3 paragraphs).",
      long: "Provide a highly detailed, comprehensive, and exhaustive answer."
    }[expectedLength];

    const systemPrompt = `You are a research assistant grounded in provided sources.
Answer ONLY using the sources below. Never use prior knowledge.
If the answer is not in the sources, say "I couldn't find this in the provided sources."

Project Global Context (For background understanding only, do NOT cite these):
${projectContext || "None provided"}

${lengthInstruction}

CITATION RULES:
- Cite every claim using [Source N] format (e.g., [Source 1], [Source 2]). Do NOT use formats like (r1) or [1].
- CRITICAL: When citing timed media (videos/audio), you MUST explicitly write the timestamp, title, and directory hierarchy (if available) into the text. Do not omit the timestamp even if you are citing multiple sources.
  Example: "This is covered at 00:02:52 in 'Catch All Route Segments' (Module 4) [Source 3]."
- If synthesizing multiple video steps, you can format them cleanly:
  "First, you do X (at 00:11:32 in 'Setup' [Source 9]). Then, you do Y (at 00:17:22 in 'Publishing' [Source 10])."
- When citing a document, mention the page:
  "According to page 12 [Source 1]..."

EXAMPLE:
Sources:
[Source 1: Timed Media — "What Is EAS Build" (module 10)]
[Location: at 00:05:23 in this video]
---
To use libraries not supported in Expo Go, you need a development build...
---

Question: How do I use unsupported libraries in Expo Go?

Answer: To use libraries that are not supported in Expo Go, you need to create a development build. This is explained at 00:05:23 in "What Is EAS Build" (module 10) [Source 1].`;

    const userPrompt = `${context.contextString}\n\nQuestion: ${query}`;

    logger.debug("[Generator] Calling LLM for generation...");

    const response = await openai.chat.completions.create({
      model: env.GENERATION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const answer = response.choices[0]?.message?.content || "I couldn't find relevant information in the provided sources.";
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    // Parse citations [Source N] from the text
    const citations: CitationPayload[] = [];
    const citationRegex = /\[Source\s+(\d+)\]/g;
    let match;
    const seenIndices = new Set<number>();

    while ((match = citationRegex.exec(answer)) !== null) {
      const index = parseInt(match[1]!, 10);
      if (!seenIndices.has(index)) {
        seenIndices.add(index);
        const chunk = context.sourceMap.get(index);
        if (chunk) {
          let displayLabel = "";
          if (chunk.pageNumber) {
            displayLabel = `p. ${chunk.pageNumber}`;
          } else if (chunk.timestampLabel) {
            displayLabel = chunk.timestampLabel;
          }

          let sourceName = chunk.subFileName || chunk.fileName || chunk.sourceUrl || "Source";
          // Try to clean up subFileName for the display chip
          if (chunk.subFileName) {
            const parts = chunk.subFileName.split('/');
            sourceName = parts.pop()?.replace(/\.(srt|vtt)$/i, '').replace(/_epm$/, '') || sourceName;
          }

          let cleanContent = chunk.content;
          cleanContent = cleanContent.replace(/\[Project Summary:.*?\]\n\n/s, "");
          cleanContent = cleanContent.replace(/\[File Path:.*?\]\n\n/s, "");
          const excerpt = cleanContent.substring(0, 150).replace(/\n/g, ' ') + "...";

          citations.push({
            index,
            chunkId: chunk.chunkId,
            sourceId: chunk.sourceId,
            displayLabel,
            score: chunk.rerankScore,
            sourceName,
            excerpt,
            startSeconds: chunk.startSeconds ?? null,
            pageNumber: chunk.pageNumber ?? null,
          });
        }
      }
    }

    return {
      answer,
      citations,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      },
    };
  }
}

export const generator = new Generator();
