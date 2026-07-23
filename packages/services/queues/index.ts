import { Queue } from "bullmq";
import { logger } from "@repo/logger";

const connection = {
  url: process.env.VALKEY_URL || "redis://127.0.0.1:6379",
};

export const extractQueue = new Queue("extract-queue", { connection });
export const ocrQueue = new Queue("ocr-queue", { connection });
export const chunkQueue = new Queue("chunk-queue", { connection });
export const cleanupQueue = new Queue("cleanup-queue", { connection });
export const reindexQueue = new Queue("reindex-queue", { connection });
// To be implemented in CP 06
export const embedQueue = new Queue("embed-queue", { connection });

[extractQueue, ocrQueue, chunkQueue, cleanupQueue, reindexQueue, embedQueue].forEach(q => {
  q.on("error", (err) => {
    logger.error(`Queue Error [${q.name}]`, { err });
  });
});

export class QueuesService {
  async addExtractJob(jobId: string, data: any) {
    return extractQueue.add("extract", data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
  
  async addOcrJob(jobId: string, data: any) {
    return ocrQueue.add("ocr", data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async addChunkJob(jobId: string, data: any) {
    return chunkQueue.add("chunk", data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async addCleanupJob(jobId: string, data: any) {
    return cleanupQueue.add("cleanup", data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async addReindexJob(jobId: string, data: any) {
    return reindexQueue.add("reindex", data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
  
  async addEmbedJob(jobId: string, data: any) {
    return embedQueue.add("embed", data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}

export const queuesService = new QueuesService();
