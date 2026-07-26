import { Worker, type Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { valkeyConnection } from "@repo/services/connection";
import { queuesService, type ReindexJobData } from "@repo/services/queues";

export const reindexWorker = new Worker<ReindexJobData>(
  "reindex-queue",
  async (job: Job<ReindexJobData>) => {
    const { sourceId, indexVersion } = job.data;
    logger.info(`Reindex job started for source ${sourceId} to v${indexVersion}`);

    await db.ingestionJob.updateMany({
      where: { sourceId, jobType: "reindex" },
      data: { status: "active", startedAt: new Date() }
    });

    try {
      await queuesService.addExtractJob(sourceId, job.data);

      // Queue cleanup for OLD version chunks (stale after reindex)
      await queuesService.addCleanupJob(sourceId, {
        sourceId,
        leafId: job.data.leafId,
        jobType: "delete_vectors",
        indexVersion, // cleanup will delete indexVersion < this value
      });

      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "reindex" },
        data: { status: "completed", completedAt: new Date() }
      });

      return { status: "success" };
    } catch (error: any) {
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "reindex" },
        data: { status: "failed", errorMessage: error.message, completedAt: new Date() }
      });
      throw error;
    }
  },
  { connection: valkeyConnection, concurrency: 2 },
);

reindexWorker.on("failed", (job, err) => {
  logger.error(`Reindex job ${job?.id} failed:`, err);
});
