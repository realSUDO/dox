import { RerankedChunk } from "./reranker";
import { env } from "../env";
import { logger } from "@repo/logger";

export class CRAGEvaluator {
  /**
   * Corrective RAG (CRAG) evaluation.
   * Filters out chunks that do not meet the minimum relevance threshold.
   */
  evaluate(chunks: RerankedChunk[]): { passed: RerankedChunk[], needsFallback: boolean } {
    const minRelevance = Number(env.CRAG_MIN_RELEVANCE) || 0.4;
    const minChunksRequired = Number(env.MIN_CHUNKS_REQUIRED) || 2;
    
    logger.debug(`[CRAG] Evaluating ${chunks.length} chunks against threshold ${minRelevance}`);

    const passed = chunks.filter(chunk => {
      // Xenova cross-encoder typically outputs a sigmoid score [0, 1] for relevance.
      // If the score is above threshold, it passes.
      return chunk.rerankScore >= minRelevance;
    });

    logger.debug(`[CRAG] ${passed.length} chunks passed relevance check.`);
    
    return {
      passed,
      needsFallback: passed.length < minChunksRequired
    };
  }
}

export const cragEvaluator = new CRAGEvaluator();
