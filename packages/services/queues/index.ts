import { Queue } from "bullmq";
import { logger } from "@repo/logger";
import { valkeyConnection } from "../connection";
import type {
  ExtractJobData,
  OcrJobData,
  ChunkJobData,
  CleanupJobData,
  ReindexJobData,
  EmbedBatchJobData,
} from "./job-types";

export * from "./job-types";

// ─── Default job options per docs/07-queues-jobs.md ───────────────
const ingestionJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 }, // 5s, 10s, 20s
  removeOnComplete: { age: 86_400 },  // keep 24h
  removeOnFail: { age: 604_800 },     // keep 7 days
};

const embedJobOptions = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2000 }, // 2s, 4s, 8s, 16s, 32s
  removeOnComplete: { age: 3_600 },
  removeOnFail: { age: 604_800 },
};

// ─── Queue definitions ─────────────────────────────────────────────
export const extractQueue = new Queue<ExtractJobData>("extract-queue", {
  connection: valkeyConnection,
  defaultJobOptions: ingestionJobOptions,
});

export const ocrQueue = new Queue<OcrJobData>("ocr-queue", {
  connection: valkeyConnection,
  defaultJobOptions: ingestionJobOptions,
});

export const chunkQueue = new Queue<ChunkJobData>("chunk-queue", {
  connection: valkeyConnection,
  defaultJobOptions: ingestionJobOptions,
});

export const cleanupQueue = new Queue<CleanupJobData>("cleanup-queue", {
  connection: valkeyConnection,
  defaultJobOptions: {
    // Delete jobs are highest priority — execute fast, minimal retries
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 1000 },
    removeOnComplete: { age: 3_600 },
    removeOnFail: { age: 604_800 },
  },
});

export const reindexQueue = new Queue<ReindexJobData>("reindex-queue", {
  connection: valkeyConnection,
  defaultJobOptions: {
    ...ingestionJobOptions,
    // Reindex is lower priority — can wait
  },
});

export const embedQueue = new Queue<EmbedBatchJobData>("embed-queue", {
  connection: valkeyConnection,
  defaultJobOptions: embedJobOptions,
});

// ─── Error logging ─────────────────────────────────────────────────
[extractQueue, ocrQueue, chunkQueue, cleanupQueue, reindexQueue, embedQueue].forEach((q) => {
  q.on("error", (err) => {
    logger.error(`Queue error [${q.name}]`, { err });
  });
});

// ─── QueuesService ─────────────────────────────────────────────────
export class QueuesService {
  /** jobId format: `extract-{sourceId}-v{indexVersion}` — deterministic for idempotency */
  async addExtractJob(sourceId: string, data: ExtractJobData) {
    return extractQueue.add("extract", data, {
      jobId: `extract-${sourceId}-v${data.indexVersion}`,
    });
  }

  async addOcrJob(sourceId: string, data: OcrJobData) {
    return ocrQueue.add("ocr", data, {
      jobId: `ocr-${sourceId}-v${data.indexVersion}`,
    });
  }

  async addChunkJob(sourceId: string, data: ChunkJobData) {
    return chunkQueue.add("chunk", data, {
      jobId: `chunk-${sourceId}-v${data.indexVersion}`,
    });
  }

  async addCleanupJob(sourceId: string, data: CleanupJobData) {
    // Deletion is idempotent — no version suffix for full source deletion
    const jobId = data.indexVersion !== undefined
      ? `cleanup-${sourceId}-v${data.indexVersion}`
      : `cleanup-${sourceId}`;
    return cleanupQueue.add("cleanup", data, { jobId });
  }

  async addReindexJob(sourceId: string, data: ReindexJobData) {
    return reindexQueue.add("reindex", data, {
      jobId: `reindex-${sourceId}-v${data.indexVersion}`,
    });
  }

  async addEmbedJob(sourceId: string, batchIndex: number, data: EmbedBatchJobData) {
    return embedQueue.add("embed_batch", data, {
      jobId: `embed-${sourceId}-v${data.indexVersion}-b${batchIndex}`,
    });
  }
}

export const queuesService = new QueuesService();
