import { RRFChunk } from "./rrf";
import { env } from "../env";
import { logger } from "@repo/logger";
import { AutoModelForSequenceClassification, AutoTokenizer } from "@xenova/transformers";

export interface RerankedChunk extends RRFChunk {
  rerankScore: number;
}

export class Reranker {
  private model: any = null;
  private tokenizer: any = null;

  private async getLocalPipeline() {
    if (!this.model || !this.tokenizer) {
      logger.info("[Reranker] Initializing local cross-encoder model...");
      this.model = await AutoModelForSequenceClassification.from_pretrained("Xenova/ms-marco-MiniLM-L-6-v2");
      this.tokenizer = await AutoTokenizer.from_pretrained("Xenova/ms-marco-MiniLM-L-6-v2");
      logger.info("[Reranker] Local cross-encoder model ready.");
    }
    return { model: this.model, tokenizer: this.tokenizer };
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
      const { model, tokenizer } = await this.getLocalPipeline();
      const reranked: RerankedChunk[] = [];

      for (const chunk of chunks) {
        try {
          let cleanContent = chunk.content;
          cleanContent = cleanContent.replace(/\[Leaf Summary:.*?\]\n\n/s, "");
          cleanContent = cleanContent.replace(/\[File Path:.*?\]\n\n/s, "");

          // CRITICAL: truncation: true prevents ONNX crash when query+chunk > 512 tokens
          const inputs = tokenizer(query, { text_pair: cleanContent, truncation: true, max_length: 512 });
          const { logits } = await model(inputs);
          
          // Use raw logit as score — ms-marco logits are NOT calibrated probabilities.
          // Higher logit = more relevant. Range is roughly [-12, +12].
          const score = logits.data[0] ?? -Infinity;
          
          reranked.push({
            ...chunk,
            rerankScore: score,
          });
        } catch (err: any) {
          logger.warn(`[Reranker] Failed to rerank chunk ${chunk.chunkId}: ${err.message}`);
          reranked.push({
            ...chunk,
            rerankScore: 0, // Lowest priority — CRAG will likely filter it
          });
        }
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
