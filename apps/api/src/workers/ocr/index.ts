import { Worker, type Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { valkeyConnection } from "@repo/services/connection";
import { queuesService, type OcrJobData } from "@repo/services/queues";
import { extractImageOcr } from "@repo/services/ingestion/extract/image";

export const ocrWorker = new Worker<OcrJobData>(
  "ocr-queue",
  async (job: Job<OcrJobData>) => {
    const { sourceId, leafId, indexVersion, filePath } = job.data;
    logger.info(`OCR job started for source ${sourceId}`);

    try {
      const text = await extractImageOcr(filePath);

      await queuesService.addChunkJob(sourceId, {
        sourceId,
        leafId,
        indexVersion,
        extractedData: [{ type: "text", text }],
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
  { connection: valkeyConnection, concurrency: 2 },
);

ocrWorker.on("failed", (job, err) => {
  logger.error(`OCR job ${job?.id} failed:`, err);
});
