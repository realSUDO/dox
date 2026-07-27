import { Worker, type Job } from "bullmq";
import { logger } from "@repo/logger";
import { db } from "@repo/database";
import { valkeyConnection } from "@repo/services/connection";
import { embeddingService } from "@repo/services/embedding";
import { qdrantService } from "@repo/services/qdrant";
import { creditService } from "@repo/services/credits";
import type { EmbedBatchJobData } from "@repo/services/queues";

export const embedWorker = new Worker<EmbedBatchJobData>(
  "embed-queue",
  async (job: Job<EmbedBatchJobData>) => {
    const { sourceId, leafId, indexVersion, chunkIds } = job.data;
    logger.info(
      `[embed-worker] Started: sourceId=${sourceId} v=${indexVersion} chunks=${chunkIds.length}`,
    );

    // ── 1. Load chunk rows from Postgres ──────────────────────────────────────
    const chunks = await db.chunk.findMany({
      where: { id: { in: chunkIds }, status: "pending" },
      include: { source: { select: { type: true, fileName: true, sourceUrl: true } } },
    });

    if (chunks.length === 0) {
      // All chunks already embedded (idempotent retry case)
      logger.warn(`[embed-worker] No pending chunks found for batch — already processed?`);
      return { status: "skipped", reason: "no_pending_chunks" };
    }

    // ── 2. Embed all chunk texts in one batched call ───────────────────────────
    const texts = chunks.map((c) => c.content);
    const { vectors, totalTokens } = await embeddingService.embedBatch(texts);

    if (vectors.length !== chunks.length) {
      throw new Error(
        `[embed-worker] Vector count mismatch: got ${vectors.length}, expected ${chunks.length}`,
      );
    }

    // ── 2.5 Deduct Credits ──────────────────────────────────────────────────
    const leaf = await db.leaf.findUnique({ where: { id: leafId }, select: { ownerId: true } });
    if (leaf && totalTokens > 0) {
      try {
        await creditService.deductTokens(leaf.ownerId, totalTokens);
        logger.info(`[embed-worker] Deducted ${totalTokens} tokens from user ${leaf.ownerId}`);
      } catch (e: any) {
        logger.error(`[embed-worker] Failed to deduct credits: ${e.message}`);
        throw new Error(`Out of credits: ${e.message}`);
      }
    }

    // ── 3. Ensure Qdrant collection exists ────────────────────────────────────
    await qdrantService.ensureCollection(leafId);

    // ── 4. Upsert vectors into Qdrant with full payload ───────────────────────
    const points = chunks.map((chunk, i) => ({
      id: chunk.qdrantPointId, // UUID — pre-assigned at chunk creation time
      vector: vectors[i]!,
      payload: {
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        leafId: chunk.leafId,
        indexVersion: chunk.indexVersion,
        content: chunk.content,
        pageNumber: chunk.pageNumber ?? null,
        startSeconds: chunk.startSeconds ?? null,
        endSeconds: chunk.endSeconds ?? null,
        timestampLabel: chunk.timestampLabel ?? null,
        sourceType: chunk.source.type,
        fileName: chunk.source.fileName ?? null,
        subFileName: (chunk as any).subFileName ?? null,
        sourceUrl: chunk.source.sourceUrl ?? null,
      },
    }));

    await qdrantService.upsertPoints(leafId, points);

    // ── 5. Mark chunks as indexed in Postgres ─────────────────────────────────
    await db.chunk.updateMany({
      where: { id: { in: chunks.map((c) => c.id) } },
      data: { status: "indexed" },
    });

    logger.info(
      `[embed-worker] Upserted ${chunks.length} vectors for sourceId=${sourceId}`,
    );

    // ── 6. Check if the entire source is now fully indexed ────────────────────
    const pendingCount = await db.chunk.count({
      where: { sourceId, indexVersion, status: "pending" },
    });

    if (pendingCount === 0) {
      // All batches complete — mark the source as indexed
      const totalChunks = await db.chunk.count({
        where: { sourceId, indexVersion, status: "indexed" },
      });

      await db.source.update({
        where: { id: sourceId },
        data: {
          status: "indexed",
          indexedAt: new Date(),
          chunkCount: totalChunks,
        },
      });

      // Update the ingestion_jobs row to completed
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "ingest" },
        data: { status: "completed", completedAt: new Date() },
      });

      logger.info(
        `[embed-worker] Source fully indexed: sourceId=${sourceId}, totalChunks=${totalChunks}`,
      );
    }

    return { status: "success", embedded: chunks.length };
  },
  {
    connection: valkeyConnection,
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 60_000, // max 50 embed jobs/min — respects OpenAI RPM limits
    },
  },
);

embedWorker.on("failed", (job, err) => {
  logger.error(`[embed-worker] Job ${job?.id} permanently failed`, { err });
});
