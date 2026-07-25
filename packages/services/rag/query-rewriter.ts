import OpenAI from "openai";
import { env } from "../env";
import { logger } from "@repo/logger";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({
  baseURL: env.OPENAI_API_BASE,
  apiKey: env.OPENAI_API_KEY,
});

export const QueryRewriteSchema = z.object({
  intent: z.enum(["factual", "exploratory", "comparative", "temporal"]),
  expectedLength: z.enum(["short", "medium", "long"]).describe("How long the final answer should ideally be, based on the query complexity"),
  rewrittenQuery: z.string().describe("The user's query corrected for typos and grammar, made standalone based on history"),
  stepBackQuery: z.string().describe("A broader, more abstract version of the query to capture general concepts"),
  subQueries: z.array(z.string()).describe("Independent sub-queries if the original asks multiple things or uses conjunctions. Empty if simple."),
  hydePassage: z.string().describe("A 1-2 sentence hypothetical answer to the query to be used for dense embedding retrieval"),
});

export type QueryRewriteResult = z.infer<typeof QueryRewriteSchema>;

export class QueryRewriter {
  async rewrite(query: string, historyContext: string, projectContext: string = ""): Promise<QueryRewriteResult> {
    logger.debug(`[QueryRewriter] Rewriting query: ${query.substring(0, 50)}...`);

    const prompt = `You are a search query analyzer for an educational content knowledge base.
The user may ask about content from video lectures, PDFs, or text notes.

Given the user's query and chat history:
1. Classify intent
2. Determine expected answer length (short, medium, long)
3. Rewrite for clarity (resolve pronouns using history)
4. Generate a step-back question (broader concept)
5. Decompose into sub-queries if complex
6. Write a 1-2 sentence hypothetical answer (HyDE)

User Query: ${query}

Chat History:
${historyContext || "None"}

Project Context (File Structure & Summaries):
${projectContext || "None"}`;

    const response = await openai.chat.completions.parse({
      model: env.QUERY_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      response_format: zodResponseFormat(QueryRewriteSchema, "query_rewrite"),
      temperature: 0.1,
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("Failed to parse query rewrite response");
    }

    logger.info(`[QueryRewriter] Detailed Analysis Result:
  - Intent: ${parsed.intent}
  - Expected Length: ${parsed.expectedLength}
  - Rewritten Query: "${parsed.rewrittenQuery}"
  - Step-back Query: "${parsed.stepBackQuery}"
  - Sub-queries: ${parsed.subQueries.length > 0 ? JSON.stringify(parsed.subQueries) : "None"}
  - HyDE Passage: "${parsed.hydePassage}"`);

    return parsed;
  }
}

export const queryRewriter = new QueryRewriter();
