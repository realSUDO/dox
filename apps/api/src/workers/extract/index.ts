import { Worker, Job } from "bullmq";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { queuesService } from "@repo/services/queues";
import { spacesService } from "@repo/services/spaces";
import { createTempDir, cleanupTempDir } from "@repo/services/ingestion/temp-files";
import { extractPdf } from "@repo/services/ingestion/extract/pdf";
import { extractSrt } from "@repo/services/ingestion/extract/srt";
import { extractVtt } from "@repo/services/ingestion/extract/vtt";
import { extractHtml } from "@repo/services/ingestion/extract/html";
import { extractText } from "@repo/services/ingestion/extract/text";
import { extractZip } from "@repo/services/ingestion/extract/zip";
import fs from "node:fs/promises";
import path from "node:path";

const connection = {
  url: process.env.VALKEY_URL || "redis://127.0.0.1:6379",
};

export const extractWorker = new Worker(
  "extract-queue",
  async (job: Job) => {
    const { sourceId, projectId, indexVersion } = job.data;
    logger.info(`Extract job started for source ${sourceId}`);

    const source = await db.source.findUnique({ where: { id: sourceId } });
    if (!source) throw new Error("Source not found");

    await db.source.update({
      where: { id: sourceId },
      data: { status: "extracting" }
    });

    await db.ingestionJob.updateMany({
      where: { sourceId, jobType: "ingest" },
      data: { status: "active", startedAt: new Date() }
    });

    const tempDir = await createTempDir(job.id!);
    
    try {
      let extractedData: any = [];
      let format = source.mimeType;

      if (source.type === "text") {
        const text = await extractText(source.textContent || "");
        extractedData = [{ type: "text", text }];
      } else if (source.type === "link") {
        // Simple fetch for HTML
        const res = await fetch(source.sourceUrl!);
        const html = await res.text();
        const text = extractHtml(html, source.sourceUrl!);
        extractedData = [{ type: "text", text }];
      } else if (source.type === "file" && source.storageKey) {
        // Download from Spaces
        const downloadPath = path.join(tempDir, source.fileName || "file");
        await spacesService.downloadFile(source.storageKey, downloadPath);

        if (format === "application/pdf") {
          const pages = await extractPdf(downloadPath);
          extractedData = [{ type: "pdf", pages }];
        } else if (format === "application/x-subrip") {
          const content = await fs.readFile(downloadPath, "utf-8");
          const cues = extractSrt(content);
          extractedData = [{ type: "srt", cues }];
        } else if (format === "text/vtt") {
          const content = await fs.readFile(downloadPath, "utf-8");
          const cues = extractVtt(content);
          extractedData = [{ type: "vtt", cues }];
        } else if (format === "application/zip") {
          const extractedFiles = await extractZip(downloadPath, tempDir);
          // For MVP, just treating zip contents as plain text or pdf
          // Here we would iterate through extractedFiles and run appropriate extractors
          // We'll queue OCR for images or process text directly
          extractedData = [{ type: "zip", files: extractedFiles }];
        } else if (format?.startsWith("image/")) {
          // Push to OCR queue
          await queuesService.addOcrJob(`ocr-${sourceId}-v${indexVersion}`, {
            sourceId,
            projectId,
            indexVersion,
            filePath: downloadPath // In a real distributed system, we'd upload back to spaces. For MVP single VM, temp file works.
          });
          return { status: "delegated_to_ocr" };
        } else {
          // Fallback plain text
          const content = await fs.readFile(downloadPath, "utf-8");
          extractedData = [{ type: "text", text: content }];
        }
      }

      // Route to chunk queue
      await queuesService.addChunkJob(`chunk-${sourceId}-v${indexVersion}`, {
        sourceId,
        projectId,
        indexVersion,
        extractedData
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
    } finally {
      await cleanupTempDir(job.id!);
    }
  },
  { connection }
);

extractWorker.on("failed", (job, err) => {
  logger.error(`Extract job ${job?.id} failed:`, err);
});
