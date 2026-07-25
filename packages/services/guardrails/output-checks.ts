import { restorePII } from "./pii";
import OpenAI from "openai";
import { env } from "../env";
import { logger } from "@repo/logger";
import { GuardrailEventPayload } from "./input-checks";

const openai = new OpenAI({
  baseURL: env.OPENAI_API_BASE,
  apiKey: env.OPENAI_API_KEY,
});

export interface OutputCheckContext {
  userId: string;
  projectId: string;
  piiMap: Map<string, string>;
}

export interface OutputCheckResult {
  safeAnswer: string;
  events: GuardrailEventPayload[];
}

export async function checkOutput(answer: string, ctx: OutputCheckContext): Promise<OutputCheckResult> {
  const events: GuardrailEventPayload[] = [];
  let currentAnswer = answer;

  // 1. Length / Sanity check
  if (!currentAnswer || currentAnswer.trim().length < 10) {
    events.push({
      stage: "output",
      rule: "policy",
      action: "flagged",
      payload: { excerpt: currentAnswer || "[Empty]" }
    });
    currentAnswer = "I couldn't generate a response. Please try rephrasing your question.";
  }

  // 2. Ungrounded Claim Check (Look for [Source N])
  const citationRegex = /\[Source\s+\d+\]/g;
  if (!citationRegex.test(currentAnswer) && currentAnswer !== "I couldn't generate a response. Please try rephrasing your question." && !currentAnswer.includes("I couldn't find this in the provided sources")) {
    events.push({
      stage: "output",
      rule: "ungrounded",
      action: "flagged",
      payload: { excerpt: currentAnswer.substring(0, 200) }
    });
    currentAnswer += "\n\n⚠️ This answer could not be grounded in the provided sources. Please verify independently.";
  }

  // 3. PII Restoration
  if (ctx.piiMap.size > 0) {
    currentAnswer = restorePII(currentAnswer, ctx.piiMap);
  }

  // 4. Unsafe Output (Moderation API)
  try {
    const modResult = await openai.moderations.create({ input: currentAnswer });
    if (modResult.results[0]?.flagged) {
      events.push({
        stage: "output",
        rule: "unsafe_output",
        action: "blocked",
        payload: {
          excerpt: currentAnswer.substring(0, 200),
          moderationCategories: modResult.results[0].categories
        }
      });
      return {
        safeAnswer: "I'm sorry, I can't provide that information.",
        events
      };
    }
  } catch (err) {
    logger.error("[Guardrails] OpenAI Moderation API failed during output check, failing open.", { err });
    // Fail open
  }

  return { safeAnswer: currentAnswer, events };
}
