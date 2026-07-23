import { Worker, Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { queuesService } from "@repo/services/queues";

const connection = {
  url: process.env.VALKEY_URL || "redis://127.0.0.1:6379",
};

export const reindexWorker = new Worker(
  "reindex-queue",
  async (job: Job) => {
    const { sourceId, indexVersion } = job.data;
    logger.info(`Reindex job started for source ${sourceId} to v${indexVersion}`);

    await db.ingestionJob.updateMany({
      where: { sourceId, jobType: "reindex" },
      data: { status: "active", startedAt: new Date() }
    });

    try {
      // Queue extract job for the new version
      await queuesService.addExtractJob(`extract-${sourceId}-v${indexVersion}`, job.data);
      
      // Queue cleanup for the OLD version (less than indexVersion)
      await queuesService.addCleanupJob(`cleanup-${sourceId}-v${indexVersion}`, {
        sourceId,
        indexVersion
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
  { connection }
);

reindexWorker.on("failed", (job, err) => {
  logger.error(`Reindex job ${job?.id} failed:`, err);
});
