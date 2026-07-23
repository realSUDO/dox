import { Worker, Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { queuesService } from "@repo/services/queues";
import { extractImageOcr } from "@repo/services/ingestion/extract/image";

const connection = {
  url: process.env.VALKEY_URL || "redis://127.0.0.1:6379",
};

export const ocrWorker = new Worker(
  "ocr-queue",
  async (job: Job) => {
    const { sourceId, projectId, indexVersion, filePath } = job.data;
    logger.info(`OCR job started for source ${sourceId}`);

    try {
      const text = await extractImageOcr(filePath);

      await queuesService.addChunkJob(`chunk-${sourceId}-v${indexVersion}`, {
        sourceId,
        projectId,
        indexVersion,
        extractedData: [{ type: "text", text }]
      });

      return { status: "success" };
    } catch (error: any) {
      await db.source.update({
        where: { id: sourceId },
        data: { status: "failed", lastError: error.message }
      });
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "ingest" },
        data: { status: "failed", errorMessage: error.message, completedAt: new Date() }
      });
      throw error;
    }
  },
  { connection }
);

ocrWorker.on("failed", (job, err) => {
  logger.error(`OCR job ${job?.id} failed:`, err);
});
