import { logger } from "@repo/logger";
import { extractWorker } from "./extract";
import { ocrWorker } from "./ocr";
import { chunkWorker } from "./chunk";
import { cleanupWorker } from "./cleanup";
import { reindexWorker } from "./reindex";
import { embedWorker } from "./embed";

export function startWorkers() {
  logger.info("[workers] Starting background workers...");

  const workers = [
    extractWorker,
    ocrWorker,
    chunkWorker,
    cleanupWorker,
    reindexWorker,
    embedWorker,
  ];

  workers.forEach((worker) => {
    worker.on("ready", () => {
      logger.info(`[workers] Ready: ${worker.name}`);
    });
    worker.on("error", (err) => {
      // Errors from individual jobs are handled inside each worker.
      // This catches connection-level errors.
      logger.error(`[workers] Connection error on ${worker.name}`, { err });
    });
  });

  logger.info(`[workers] ${workers.length} workers initialized`);
}
