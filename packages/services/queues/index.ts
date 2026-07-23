import { Queue } from "bullmq";
import { logger } from "@repo/logger";

const connection = {
  url: process.env.VALKEY_URL || "redis://127.0.0.1:6379",
};

export const ingestionQueue = new Queue("ingestion-queue", {
  connection,
});

ingestionQueue.on("error", (err) => {
  logger.error("Ingestion Queue Error", { err });
});

export class QueuesService {
  async addIngestionJob(jobId: string, data: any) {
    return ingestionQueue.add(data.jobType, data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}

export const queuesService = new QueuesService();
