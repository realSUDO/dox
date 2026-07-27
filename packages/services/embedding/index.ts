import OpenAI from "openai";
import { logger } from "@repo/logger";
import { env } from "../env";

// ── Constants ───────────────────────────────────────────────────────────────
// OpenAI text-embedding-3-small produces 1536-dim vectors
const VECTOR_DIMENSIONS = 1536;

// Safe token cap per OpenAI request. We use a character estimate:
// 1 token ≈ 4 chars. 125,000 tokens * 4 = ~500,000 chars per request.
const MAX_CHARS_PER_REQUEST = 500_000;

// ── OpenAI Client ────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  ...(env.OPENAI_API_BASE ? { baseURL: env.OPENAI_API_BASE } : {}),
});

// ── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit =
        err instanceof OpenAI.RateLimitError ||
        (err instanceof OpenAI.APIError && err.status === 429);

      if (isRateLimit && attempt < maxAttempts) {
        const delay = Math.min(2 ** attempt * 1000, 32_000); // 2s, 4s, 8s, 16s, 32s
        logger.warn(
          `[EmbeddingService] Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  // TypeScript needs this — unreachable
  throw new Error("Max retries exceeded");
}

// ── EmbeddingService ─────────────────────────────────────────────────────────
export class EmbeddingService {
  private readonly model: string;

  constructor() {
    this.model = env.EMBED_MODEL;
    logger.info(`[EmbeddingService] Initialized with model: ${this.model}`);
  }

  /**
   * Embed a single text string.
   * Returns a 1536-dim float32 vector.
   */
  async embedSingle(text: string): Promise<number[]> {
    const { vectors } = await this.embedBatch([text]);
    const first = vectors[0];
    if (!first) throw new Error("EmbeddingService: no vector returned for single embed");
    return first;
  }

  /**
   * Embed an array of texts in batches that respect OpenAI's token limit.
   * Returns vectors in the same order as the input texts.
   */
  async embedBatch(texts: string[]): Promise<{ vectors: number[][]; totalTokens: number }> {
    if (texts.length === 0) return { vectors: [], totalTokens: 0 };

    const results: number[][] = new Array(texts.length);
    let totalTokens = 0;

    // Split texts into sub-batches that fit within the character limit
    const batches: Array<{ indices: number[]; texts: string[] }> = [];
    let currentBatch: { indices: number[]; texts: string[] } = {
      indices: [],
      texts: [],
    };
    let currentChars = 0;

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]!;
      const textChars = text.length;

      // If adding this text would exceed the limit AND we already have items,
      // flush current batch and start a new one.
      if (currentChars + textChars > MAX_CHARS_PER_REQUEST && currentBatch.texts.length > 0) {
        batches.push(currentBatch);
        currentBatch = { indices: [], texts: [] };
        currentChars = 0;
      }

      currentBatch.indices.push(i);
      currentBatch.texts.push(text);
      currentChars += textChars;
    }
    if (currentBatch.texts.length > 0) batches.push(currentBatch);

    logger.debug(
      `[EmbeddingService] Embedding ${texts.length} texts in ${batches.length} request(s)`,
    );

    // Process each sub-batch concurrently with retry logic
    const batchPromises = batches.map(async (batch) => {
      const response = await withRetry(() =>
        openai.embeddings.create({
          model: this.model,
          input: batch.texts,
        }),
      );

      if (response.data.length !== batch.texts.length) {
        throw new Error(
          `[EmbeddingService] Response length mismatch: expected ${batch.texts.length}, got ${response.data.length}`,
        );
      }

      for (let j = 0; j < batch.indices.length; j++) {
        const idx = batch.indices[j]!;
        const embedding = response.data[j];
        if (!embedding) {
          throw new Error(`[EmbeddingService] Missing embedding at index ${j}`);
        }
        results[idx] = embedding.embedding;
      }
      
      // Track token usage for credits
      if (response.usage && response.usage.prompt_tokens) {
        totalTokens += response.usage.prompt_tokens;
      }
    });

    await Promise.all(batchPromises);

    return { vectors: results, totalTokens };
  }

  /** Returns the vector dimension this model produces. */
  get dimensions(): number {
    return VECTOR_DIMENSIONS;
  }
}

export const embeddingService = new EmbeddingService();
