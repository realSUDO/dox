import { Worker, Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { queuesService } from "@repo/services/queues";
import { chunkSlidingWindow } from "@repo/services/ingestion/chunk/sliding-window";
import { chunkRecursiveSplitter } from "@repo/services/ingestion/chunk/recursive-splitter";
import { normalizeText } from "@repo/services/ingestion/chunk/normalizer";

const connection = {
  url: process.env.VALKEY_URL || "redis://127.0.0.1:6379",
};

export const chunkWorker = new Worker(
  "chunk-queue",
  async (job: Job) => {
    const { sourceId, projectId, indexVersion, extractedData } = job.data;
    logger.info(`Chunk job started for source ${sourceId}`);

    await db.source.update({
      where: { id: sourceId },
      data: { status: "chunking" }
    });

    try {
      const chunksToInsert: any[] = [];
      let chunkIndex = 0;

      for (const data of extractedData) {
        if (data.type === "srt" || data.type === "vtt") {
          // Normalizer not strictly required here since we want precise timing, 
          // but we can clean text inside cues if needed. Let's chunk directly first.
          const slidingChunks = chunkSlidingWindow(data.cues);
          for (const chunk of slidingChunks) {
            chunksToInsert.push({
              sourceId,
              projectId,
              indexVersion,
              chunkIndex: chunkIndex++,
              content: normalizeText(chunk.text),
              startSeconds: chunk.startSeconds,
              endSeconds: chunk.endSeconds,
              timestampLabel: chunk.timestampLabel,
              qdrantPointId: require("crypto").randomUUID(),
              status: "pending"
            });
          }
        } else if (data.type === "pdf") {
          const splitChunks = chunkRecursiveSplitter(
            data.pages.map((p: any) => ({ text: normalizeText(p.text), pageNumber: p.pageNumber }))
          );
          for (const chunk of splitChunks) {
            chunksToInsert.push({
              sourceId,
              projectId,
              indexVersion,
              chunkIndex: chunkIndex++,
              content: chunk.text,
              pageNumber: chunk.pageNumber,
              qdrantPointId: require("crypto").randomUUID(),
              status: "pending"
            });
          }
        } else if (data.type === "text") {
          const splitChunks = chunkRecursiveSplitter([{ text: normalizeText(data.text) }]);
          for (const chunk of splitChunks) {
            chunksToInsert.push({
              sourceId,
              projectId,
              indexVersion,
              chunkIndex: chunkIndex++,
              content: chunk.text,
              qdrantPointId: require("crypto").randomUUID(),
              status: "pending"
            });
          }
        } else if (data.type === "zip") {
          // Future: Implement recursive calling or mapping.
          // For MVP we just parse text directly
        }
      }

      if (chunksToInsert.length === 0) {
        throw new Error("No extractable text found");
      }

      // Persist chunks
      // Using transactions for large inserts if needed, but createMany is fine.
      await db.chunk.createMany({
        data: chunksToInsert
      });

      // Update source status
      await db.source.update({
        where: { id: sourceId },
        data: { 
          status: "embedding",
          chunkCount: chunksToInsert.length
        }
      });

      // Route to embed queue (Milestone 06) in batches
      const chunkIds = (await db.chunk.findMany({
        where: { sourceId, indexVersion },
        select: { id: true },
        orderBy: { chunkIndex: "asc" }
      })).map(c => c.id);

      const EMBED_BATCH_SIZE = 100;
      for (let i = 0; i < chunkIds.length; i += EMBED_BATCH_SIZE) {
        const batchIds = chunkIds.slice(i, i + EMBED_BATCH_SIZE);
        await queuesService.addEmbedJob(`embed_batch-${sourceId}-v${indexVersion}-${i}`, {
          sourceId,
          projectId,
          indexVersion,
          chunkIds: batchIds
        });
      }

      return { status: "success", chunkCount: chunksToInsert.length };

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

chunkWorker.on("failed", (job, err) => {
  logger.error(`Chunk job ${job?.id} failed:`, err);
});
