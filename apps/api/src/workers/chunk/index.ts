import { Worker, type Job } from "bullmq";
import { randomUUID } from "node:crypto";

import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { valkeyConnection } from "@repo/services/connection";
import { queuesService, type ChunkJobData, type ExtractedItem } from "@repo/services/queues";
import { chunkSlidingWindow } from "@repo/services/ingestion/chunk/sliding-window";
import { chunkRecursiveSplitter } from "@repo/services/ingestion/chunk/recursive-splitter";
import { normalizeText } from "@repo/services/ingestion/chunk/normalizer";

const EMBED_BATCH_SIZE = 100;

export const chunkWorker = new Worker<ChunkJobData>(
  "chunk-queue",
  async (job: Job<ChunkJobData>) => {
    const { sourceId, projectId, indexVersion, extractedData } = job.data;
    logger.info(`[chunk-worker] Started: sourceId=${sourceId} v=${indexVersion}`);

    const source = await db.source.update({
      where: { id: sourceId },
      data: { status: "chunking" },
      select: { metadata: true }
    });

    const summary = (source.metadata as any)?.summary;

    try {
      const chunksToInsert: Array<{
        sourceId: string;
        projectId: string;
        indexVersion: number;
        chunkIndex: number;
        content: string;
        pageNumber?: number | null;
        startSeconds?: number | null;
        endSeconds?: number | null;
        timestampLabel?: string | null;
        qdrantPointId: string;
        subFileName?: string | null;
        status: string;
      }> = [];

      let chunkIndex = 0;

      for (const item of extractedData) {
        if (item.type === "srt" || item.type === "vtt") {
          const chunks = chunkSlidingWindow(item.cues);
          for (const chunk of chunks) {
            const rawText = normalizeText(chunk.text);
            const contentParts = [];
            if (summary) contentParts.push(`[Project Summary: ${summary}]`);
            if (item.fileName) contentParts.push(`[File Path: ${item.fileName}]`);
            contentParts.push(rawText);

            chunksToInsert.push({
              sourceId,
              projectId,
              indexVersion,
              chunkIndex: chunkIndex++,
              content: contentParts.join("\n\n"),
              startSeconds: chunk.startSeconds,
              endSeconds: chunk.endSeconds,
              timestampLabel: chunk.timestampLabel,
              qdrantPointId: randomUUID(),
              subFileName: item.fileName ?? null,
              status: "pending",
            });
          }

        } else if (item.type === "pdf") {
          const splitChunks = chunkRecursiveSplitter(
            item.pages.map((p) => ({ text: normalizeText(p.text), pageNumber: p.pageNumber })),
          );
          for (const chunk of splitChunks) {
            const rawText = chunk.text;
            const contentParts = [];
            if (summary) contentParts.push(`[Project Summary: ${summary}]`);
            if (item.fileName) contentParts.push(`[File Path: ${item.fileName}]`);
            contentParts.push(rawText);

            chunksToInsert.push({
              sourceId,
              projectId,
              indexVersion,
              chunkIndex: chunkIndex++,
              content: contentParts.join("\n\n"),
              pageNumber: chunk.pageNumber ?? null,
              qdrantPointId: randomUUID(),
              subFileName: item.fileName ?? null,
              status: "pending",
            });
          }

        } else if (item.type === "text") {
          const splitChunks = chunkRecursiveSplitter([{ text: normalizeText(item.text) }]);
          for (const chunk of splitChunks) {
            const rawText = chunk.text;
            const contentParts = [];
            if (summary) contentParts.push(`[Project Summary: ${summary}]`);
            if (item.fileName) contentParts.push(`[File Path: ${item.fileName}]`);
            contentParts.push(rawText);

            chunksToInsert.push({
              sourceId,
              projectId,
              indexVersion,
              chunkIndex: chunkIndex++,
              content: contentParts.join("\n\n"),
              qdrantPointId: randomUUID(),
              subFileName: item.fileName ?? null,
              status: "pending",
            });
          }
        }
      }

      if (chunksToInsert.length === 0) {
        throw new Error("No extractable text found — cannot create chunks");
      }

      // Persist all chunks in parallel batches of 500
      const BATCH_SIZE = 500;
      const insertPromises = [];
      for (let i = 0; i < chunksToInsert.length; i += BATCH_SIZE) {
        const batch = chunksToInsert.slice(i, i + BATCH_SIZE);
        insertPromises.push(db.chunk.createMany({ data: batch }));
      }
      await Promise.all(insertPromises);

      // Pause for approval BEFORE embedding
      await db.source.update({
        where: { id: sourceId },
        data: { status: "pending_approval", chunkCount: chunksToInsert.length },
      });

      // We complete the ingestion job here since we are pausing. 
      // The API approval route will create a new ingestion job for embedding.
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "ingest" },
        data: { status: "completed", completedAt: new Date() },
      });

      logger.info(
        `[chunk-worker] Paused for approval: sourceId=${sourceId}, chunks=${chunksToInsert.length}`,
      );
      return { status: "success", chunkCount: chunksToInsert.length, requiresApproval: true };


    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[chunk-worker] Failed: sourceId=${sourceId}`, { err: error });

      await db.source.update({
        where: { id: sourceId },
        data: { status: "failed", lastError: message },
      });
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "ingest" },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
      throw error;
    }
  },
  {
    connection: valkeyConnection,
    concurrency: 3,
  },
);

chunkWorker.on("failed", (job, err) => {
  logger.error(`[chunk-worker] Job ${job?.id} permanently failed`, { err });
});
