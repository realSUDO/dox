import { RetrievedChunk } from "./retriever";
import { logger } from "@repo/logger";

const RRF_K = 60; // Standard Reciprocal Rank Fusion constant

export interface RRFChunk extends RetrievedChunk {
  rrfScore: number;
}

export class ReciprocalRankFusion {
  /**
   * Merges multiple ranked lists of chunks into a single list using RRF.
   * RRF Score = sum(1 / (k + rank)) across all lists where the chunk appears.
   */
  merge(resultLists: RetrievedChunk[][], topK: number = 30): RRFChunk[] {
    const chunkMap = new Map<string, RRFChunk>();

    for (const list of resultLists) {
      // Each list is assumed to be ordered by relevance (rank 1 is index 0)
      for (let rankIndex = 0; rankIndex < list.length; rankIndex++) {
        const chunk = list[rankIndex];
        if (!chunk) continue;
        
        const rank = rankIndex + 1; // 1-indexed rank
        const rrfContribution = 1 / (RRF_K + rank);

        const existing = chunkMap.get(chunk.chunkId);
        if (existing) {
          existing.rrfScore += rrfContribution;
        } else {
          chunkMap.set(chunk.chunkId, {
            ...chunk,
            rrfScore: rrfContribution,
          });
        }
      }
    }

    // Convert map to array, sort by rrfScore descending, and limit to topK
    const mergedList = Array.from(chunkMap.values());
    mergedList.sort((a, b) => b.rrfScore - a.rrfScore);

    logger.debug(`[RRF] Merged ${resultLists.length} lists into ${mergedList.length} unique chunks`);

    return mergedList.slice(0, topK);
  }
}

export const rrf = new ReciprocalRankFusion();
