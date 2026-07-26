import { Worker, type Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { valkeyConnection } from "@repo/services/connection";
import { qdrantService } from "@repo/services/qdrant";
import type { CleanupJobData } from "@repo/services/queues";


export const cleanupWorker = new Worker<CleanupJobData>(
  "cleanup-queue",
  async (job: Job<CleanupJobData>) => {
    const { sourceId, leafId, indexVersion } = job.data;
    logger.info(
      `[cleanup-worker] Started: sourceId=${sourceId}` +
      (indexVersion !== undefined ? ` stale v<${indexVersion}` : " full delete"),
    );

    await db.ingestionJob.updateMany({
      where: { sourceId, jobType: "delete_vectors" },
      data: { status: "active", startedAt: new Date() },
    });

    try {
      // ── 1. Delete Qdrant vectors ──────────────────────────────────────────
      // Must happen before Postgres chunk deletion (chunk IDs are the Qdrant point IDs)
      await qdrantService.deleteByFilter(leafId, {
        sourceId,
        ...(indexVersion !== undefined ? { indexVersionLt: indexVersion } : {}),
      });

      // ── 2. Delete Postgres chunk rows ────────────────────────────────────
      if (indexVersion === undefined) {
        // Full source deletion — remove all chunks
        await db.chunk.deleteMany({ where: { sourceId } });
      } else {
        // Post-reindex stale chunk cleanup
        await db.chunk.deleteMany({
          where: { sourceId, indexVersion: { lt: indexVersion } },
        });
      }

      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "delete_vectors" },
        data: { status: "completed", completedAt: new Date() },
      });

      logger.info(`[cleanup-worker] Done: sourceId=${sourceId}`);
      return { status: "success" };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[cleanup-worker] Failed: sourceId=${sourceId}`, { err: error });
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "delete_vectors" },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
      throw error;
    }
  },
  { connection: valkeyConnection, concurrency: 5 },
);


cleanupWorker.on("failed", (job, err) => {
  logger.error(`Cleanup job ${job?.id} failed:`, err);
});
