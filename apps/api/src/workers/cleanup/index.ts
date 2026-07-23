import { Worker, Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";

const connection = {
  url: process.env.VALKEY_URL || "redis://127.0.0.1:6379",
};

export const cleanupWorker = new Worker(
  "cleanup-queue",
  async (job: Job) => {
    const { sourceId, indexVersion } = job.data;
    logger.info(`Cleanup job started for source ${sourceId}`);

    await db.ingestionJob.updateMany({
      where: { sourceId, jobType: "delete_vectors" },
      data: { status: "active", startedAt: new Date() }
    });

    try {
      // For Milestone 5, Qdrant deletion is skipped because it belongs in Milestone 6
      // In Milestone 6, we will call QdrantService here.

      // Delete chunks from Postgres
      if (indexVersion === undefined) {
        // Full delete
        await db.chunk.deleteMany({
          where: { sourceId }
        });
      } else {
        // Stale chunks delete
        await db.chunk.deleteMany({
          where: { 
            sourceId,
            indexVersion: { lt: indexVersion }
          }
        });
      }

      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "delete_vectors" },
        data: { status: "completed", completedAt: new Date() }
      });

      return { status: "success" };
    } catch (error: any) {
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "delete_vectors" },
        data: { status: "failed", errorMessage: error.message, completedAt: new Date() }
      });
      throw error;
    }
  },
  { connection }
);

cleanupWorker.on("failed", (job, err) => {
  logger.error(`Cleanup job ${job?.id} failed:`, err);
});
