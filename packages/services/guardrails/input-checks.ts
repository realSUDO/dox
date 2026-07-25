import { detectPromptInjection } from "./injection";
import { maskPII } from "./pii";
import OpenAI from "openai";
import { env } from "../env";
import { logger } from "@repo/logger";

const openai = new OpenAI({
  baseURL: env.OPENAI_API_BASE,
  apiKey: env.OPENAI_API_KEY,
});

export interface InputCheckContext {
  userId: string;
  projectId: string;
}

export interface GuardrailEventPayload {
  stage: "input" | "output";
  rule: "prompt_injection" | "pii" | "unsafe_content" | "policy" | "ungrounded" | "unsafe_output";
  action: "blocked" | "redacted" | "flagged";
  payload: {
    excerpt: string;
    matchedPattern?: string;
    moderationCategories?: any;
  };
}

export interface InputCheckResult {
  allowed: boolean;
  sanitizedQuery: string;
  piiMap: Map<string, string>;
  events: GuardrailEventPayload[];
}

const MAX_QUERY_LENGTH = 2000;

export async function checkInput(query: string, ctx: InputCheckContext): Promise<InputCheckResult> {
  const events: GuardrailEventPayload[] = [];
  
  // 1. Policy: Max Length
  if (query.length > MAX_QUERY_LENGTH) {
    events.push({
      stage: "input",
      rule: "policy",
      action: "blocked",
      payload: { excerpt: query.substring(0, 100) + "..." }
    });
    return { allowed: false, sanitizedQuery: query, piiMap: new Map(), events };
  }

  // 2. Prompt Injection
  const injection = detectPromptInjection(query);
  if (injection.isInjected) {
    events.push({
      stage: "input",
      rule: "prompt_injection",
      action: "blocked",
      payload: {
        excerpt: query.substring(0, 200),
        matchedPattern: injection.match
      }
    });
    return { allowed: false, sanitizedQuery: query, piiMap: new Map(), events };
  }

  // 3. PII Detection & Masking
  const piiResult = maskPII(query);
  if (piiResult.matches.length > 0) {
    events.push({
      stage: "input",
      rule: "pii",
      action: "redacted",
      payload: {
        excerpt: `Redacted ${piiResult.matches.length} PII occurrences.`,
        matchedPattern: piiResult.matches.map(m => `${m.pattern}: ${m.redacted}`).join(", ")
      }
    });
  }

  // 4. Unsafe Content (OpenAI Moderation)
  try {
    const modResult = await openai.moderations.create({ input: piiResult.maskedText });
    if (modResult.results[0]?.flagged) {
      events.push({
        stage: "input",
        rule: "unsafe_content",
        action: "blocked",
        payload: {
          excerpt: piiResult.maskedText.substring(0, 200),
          moderationCategories: modResult.results[0].categories
        }
      });
      return { allowed: false, sanitizedQuery: piiResult.maskedText, piiMap: piiResult.piiMap, events };
    }
  } catch (err) {
    logger.error("[Guardrails] OpenAI Moderation API failed during input check, failing open.", { err });
    // Fail open: log warning but don't block
  }

  return {
    allowed: true,
    sanitizedQuery: piiResult.maskedText,
    piiMap: piiResult.piiMap,
    events
  };
}
