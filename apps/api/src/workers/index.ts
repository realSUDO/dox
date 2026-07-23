import { extractWorker } from "./extract";
import { ocrWorker } from "./ocr";
import { chunkWorker } from "./chunk";
import { cleanupWorker } from "./cleanup";
import { reindexWorker } from "./reindex";
import { logger } from "@repo/logger";

export function startWorkers() {
  logger.info("Starting background workers...");
  // Workers are automatically started when instantiated,
  // but this function ensures they are imported and initialized.
  
  [extractWorker, ocrWorker, chunkWorker, cleanupWorker, reindexWorker].forEach(worker => {
    worker.on("ready", () => {
      logger.info(`Worker ready: ${worker.name}`);
    });
  });
}
