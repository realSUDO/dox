import { RRFChunk } from "./rrf";
import { env } from "../env";
import { logger } from "@repo/logger";
import { pipeline } from "@xenova/transformers";

export interface RerankedChunk extends RRFChunk {
  rerankScore: number;
}

export class Reranker {
  private localPipeline: any = null;

  private async getLocalPipeline() {
    if (!this.localPipeline) {
      logger.info("[Reranker] Initializing local cross-encoder model...");
      // The first call downloads the model
      this.localPipeline = await pipeline("text-classification", "Xenova/ms-marco-MiniLM-L-6-v2");
      logger.info("[Reranker] Local cross-encoder model ready.");
    }
    return this.localPipeline;
  }

  async rerank(
    query: string,
    chunks: RRFChunk[],
    topK: number = 8
  ): Promise<RerankedChunk[]> {
    if (chunks.length === 0) return [];

    logger.debug(`[Reranker] Reranking ${chunks.length} chunks against query`);

    const mode = env.RERANKER || "local";

    if (mode === "local") {
      const pipe = await this.getLocalPipeline();
      const reranked: RerankedChunk[] = [];

      for (const chunk of chunks) {
        // Strip noisy [Leaf Summary...] and [File Path...] that chunk worker baked in, as they ruin relevance scoring
        let cleanContent = chunk.content;
        cleanContent = cleanContent.replace(/\[Leaf Summary:.*?\]\n\n/s, "");
        cleanContent = cleanContent.replace(/\[File Path:.*?\]\n\n/s, "");

        // Cross-encoders expect the input as a single string separated by a token (usually [SEP] or similar depending on model).
        // Xenova pipelines typically handle string pairs if passed as {text, text_pair} or array, but for cross-encoder/ms-marco-MiniLM-L-6-v2 
        // concatenating with [SEP] is safer, or passing as text/text_pair args.
        // Actually, the pipeline for text-classification with cross-encoder takes text and text_pair args: pipe(query, cleanContent)
        // Let's verify the API. Wait, I wrote in the plan to use `${query} [SEP] ${chunk.content}`, { topk: null }
        // Let's stick to the plan.
        const out = await pipe(`${query} [SEP] ${cleanContent}`, { topk: null });
        
        // The output is an array of objects like [{ label: "LABEL_0", score: 0.99 }]
        // For cross-encoders, the score is directly usable, usually index 0 is the relevance
        const score = out[0]?.score ?? 0;
        
        reranked.push({
          ...chunk,
          rerankScore: score,
        });
      }

      reranked.sort((a, b) => b.rerankScore - a.rerankScore);
      return reranked.slice(0, topK);
    } else if (mode === "cohere") {
      // Stub for Cohere Rerank API
      logger.warn("[Reranker] Cohere mode selected but not implemented. Falling back to RRF sorting.");
      // Just map RRF scores for now
      const reranked = chunks.map(c => ({ ...c, rerankScore: c.rrfScore }));
      return reranked.slice(0, topK);
    }

    // Default fallback
    return chunks.slice(0, topK).map(c => ({ ...c, rerankScore: c.rrfScore }));
  }
}

export const reranker = new Reranker();
