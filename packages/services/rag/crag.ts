import { RerankedChunk } from "./reranker";
import { env } from "../env";
import { logger } from "@repo/logger";

export class CRAGEvaluator {
  /**
   * Corrective RAG (CRAG) evaluation.
   * Filters out chunks below the minimum relevance threshold.
   *
   * The reranker produces raw ms-marco logits (range roughly [-12, +12]).
   *   logit > 0  → model thinks the passage IS relevant
   *   logit < 0  → model thinks the passage is NOT relevant
   *
   * Default threshold is 0 (i.e. keep chunks the model considers relevant).
   * Set CRAG_MIN_RELEVANCE env var to override (e.g. "-5" to be more lenient).
   */
  evaluate(
    chunks: RerankedChunk[],
    options?: { forceAll?: boolean }
  ): { passed: RerankedChunk[]; needsFallback: boolean } {
    // Default to 0 (logit > 0 = "relevant")
    const minRelevance = Number(env.CRAG_MIN_RELEVANCE) || 0;
    const minChunksRequired = Number(env.MIN_CHUNKS_REQUIRED) || 2;

    logger.debug(`[CRAG] Evaluating ${chunks.length} chunks against logit threshold ${minRelevance}`);

    // If forceAll is set, skip filtering — this is the last-resort fallback
    if (options?.forceAll) {
      logger.info(`[CRAG] Force-all mode: passing all ${chunks.length} chunks (sorted by score).`);
      return { passed: chunks, needsFallback: false };
    }

    const passed = chunks.filter((chunk) => chunk.rerankScore >= minRelevance);

    logger.debug(`[CRAG] ${passed.length}/${chunks.length} chunks passed (threshold=${minRelevance}).`);

    return {
      passed,
      needsFallback: passed.length < minChunksRequired,
    };
  }
}

export const cragEvaluator = new CRAGEvaluator();

