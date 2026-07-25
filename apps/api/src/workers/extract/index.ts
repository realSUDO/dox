import { Worker, type Job } from "bullmq";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { valkeyConnection } from "@repo/services/connection";
import { queuesService, type ExtractJobData } from "@repo/services/queues";
import { spacesService } from "@repo/services/spaces";
import { env } from "@repo/services/env";
import OpenAI from "openai";
import {
  createTempDir,
  cleanupTempDir,
} from "@repo/services/ingestion/temp-files";
import { extractPdf } from "@repo/services/ingestion/extract/pdf";
import { extractSrt } from "@repo/services/ingestion/extract/srt";
import { extractVtt } from "@repo/services/ingestion/extract/vtt";
import { extractHtml } from "@repo/services/ingestion/extract/html";
import { extractText } from "@repo/services/ingestion/extract/text";
import { extractZip } from "@repo/services/ingestion/extract/zip";
import type {
  ExtractedItem,
  ChunkJobData,
  OcrJobData,
} from "@repo/services/queues";
import { detectPromptInjection } from "@repo/services/guardrails";

// Helper to sanitize extracted text for indirect injection
function sanitizeExtractedText(text: string): string {
  const injection = detectPromptInjection(text);
  if (injection.isInjected) {
    logger.warn("[extract-worker] Detected indirect prompt injection in source content, wrapping safely.");
    return `[POTENTIAL_INJECTION_DETECTED]\n${text}\n[/POTENTIAL_INJECTION_DETECTED]`;
  }
  return text;
}

export const extractWorker = new Worker<ExtractJobData>(
  "extract-queue",
  async (job: Job<ExtractJobData>) => {
    const { sourceId, projectId, indexVersion } = job.data;
    logger.info(`[extract-worker] Started: sourceId=${sourceId} v=${indexVersion}`);

    const source = await db.source.findUnique({ where: { id: sourceId } });
    if (!source) throw new Error(`Source ${sourceId} not found in DB`);

    // Mark active in both source and ingestion_jobs
    await db.source.update({
      where: { id: sourceId },
      data: { status: "extracting" },
    });
    await db.ingestionJob.updateMany({
      where: { sourceId, jobType: "ingest" },
      data: { status: "active", startedAt: new Date() },
    });

    const tempDir = await createTempDir(job.id ?? randomUUID());

    try {
      const extractedData: ExtractedItem[] = [];
      const mimeType = source.mimeType ?? "";

      if (source.type === "text") {
        // ── Plain text source ────────────────────────────────────────
        const text = sanitizeExtractedText(extractText(source.textContent ?? ""));
        extractedData.push({ type: "text", text });

      } else if (source.type === "link") {
        // ── Webpage or YouTube link ──────────────────────────────────
        // Timeout after 30s, max 10MB per spec
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        try {
          const res = await fetch(source.sourceUrl!, { signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${source.sourceUrl}`);
          const html = await res.text();
          const text = sanitizeExtractedText(extractHtml(html, source.sourceUrl ?? undefined));
          extractedData.push({ type: "text", text });
        } finally {
          clearTimeout(timeout);
        }

      } else if (source.type === "file" && source.storageKey) {
        // ── File download from DO Spaces ─────────────────────────────
        const fileName = source.fileName ?? `file-${randomUUID()}`;
        const downloadPath = path.join(tempDir, fileName);
        await spacesService.downloadFile(source.storageKey, downloadPath);

        if (mimeType === "application/pdf") {
          const pages = await extractPdf(downloadPath);
          pages.forEach(p => p.text = sanitizeExtractedText(p.text));
          extractedData.push({ type: "pdf", pages });

        } else if (mimeType === "application/x-subrip" || fileName.endsWith(".srt")) {
          const content = await fs.readFile(downloadPath, "utf-8");
          const cues = extractSrt(content);
          cues.forEach(c => c.text = sanitizeExtractedText(c.text));
          extractedData.push({ type: "srt", cues });

        } else if (mimeType === "text/vtt" || fileName.endsWith(".vtt")) {
          const content = await fs.readFile(downloadPath, "utf-8");
          const cues = extractVtt(content);
          cues.forEach(c => c.text = sanitizeExtractedText(c.text));
          extractedData.push({ type: "vtt", cues });

        } else if (mimeType === "application/zip") {
          // ── ZIP: extract files and route each to appropriate extractor ──
          const zipEntries = await extractZip(downloadPath, tempDir);
          const validFiles: string[] = [];

          for (const entry of zipEntries) {
            const ext = path.extname(entry.fileName).toLowerCase();
            try {
              if (ext === ".pdf") {
                const pages = await extractPdf(entry.filePath);
                pages.forEach(p => p.text = sanitizeExtractedText(p.text));
                extractedData.push({ type: "pdf", pages, fileName: entry.fileName });
                validFiles.push(entry.fileName);

              } else if (ext === ".srt") {
                const content = await fs.readFile(entry.filePath, "utf-8");
                const cues = extractSrt(content);
                cues.forEach(c => c.text = sanitizeExtractedText(c.text));
                extractedData.push({ type: "srt", cues, fileName: entry.fileName });
                validFiles.push(entry.fileName);

              } else if (ext === ".vtt") {
                const content = await fs.readFile(entry.filePath, "utf-8");
                const cues = extractVtt(content);
                cues.forEach(c => c.text = sanitizeExtractedText(c.text));
                extractedData.push({ type: "vtt", cues, fileName: entry.fileName });
                validFiles.push(entry.fileName);

              } else if ([".txt", ".md", ".csv"].includes(ext)) {
                const content = await fs.readFile(entry.filePath, "utf-8");
                const text = sanitizeExtractedText(extractText(content));
                extractedData.push({ type: "text", text, fileName: entry.fileName });
                validFiles.push(entry.fileName);

              } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
                validFiles.push(entry.fileName);
                // Delegate image files to OCR worker — they can't be inlined here
                const ocrData: OcrJobData = {
                  sourceId,
                  projectId,
                  indexVersion,
                  filePath: entry.filePath,
                };
                await queuesService.addOcrJob(
                  `${sourceId}-img-${randomUUID()}`,
                  ocrData,
                );
              } else {
                logger.warn(
                  `[extract-worker] Skipping unsupported ZIP entry: ${entry.fileName}`,
                );
              }
            } catch (entryErr) {
              logger.warn(
                `[extract-worker] Failed to extract ZIP entry ${entry.fileName}:`,
                { err: entryErr },
              );
              // Continue processing other ZIP entries
            }
          }

          if (validFiles.length === 0) {
            throw new Error("No valid extractable files found in ZIP archive.");
          }

          // Generate LLM summary of the ZIP structure
          try {
            const openaiClient = new OpenAI({
              apiKey: env.OPENAI_API_KEY,
              ...(env.OPENAI_API_BASE ? { baseURL: env.OPENAI_API_BASE } : {}),
            });
            const response = await openaiClient.chat.completions.create({
              model: env.FAST_LLM_MODEL,
              messages: [{
                role: "system",
                content: "You are an expert software architect. Analyze the provided directory tree of an uploaded repository/ZIP. Write a concise 1-sentence summary explaining what this codebase or project is likely about based on its folders and file names."
              }, {
                role: "user",
                content: validFiles.join("\n")
              }]
            });
            const summary = response.choices[0]?.message?.content || null;
            
            await db.source.update({
              where: { id: sourceId },
              data: {
                metadata: {
                  fileTree: validFiles,
                  summary
                }
              }
            });
            logger.info(`[extract-worker] Generated ZIP summary for ${sourceId}`);
          } catch (llmErr) {
            logger.warn(`[extract-worker] Failed to generate ZIP summary`, { err: llmErr });
          }

        } else if (mimeType.startsWith("image/")) {
          // ── Image: delegate to OCR worker ───────────────────────────
          const ocrData: OcrJobData = {
            sourceId,
            projectId,
            indexVersion,
            filePath: downloadPath,
          };
          await queuesService.addOcrJob(sourceId, ocrData);
          // OCR worker will enqueue chunk job — exit here
          return { status: "delegated_to_ocr" };

        } else {
          // ── Fallback: try plain text ─────────────────────────────────
          const content = await fs.readFile(downloadPath, "utf-8");
          const text = sanitizeExtractedText(content);
          extractedData.push({ type: "text", text });
        }
      }

      if (extractedData.length === 0) {
        throw new Error("No extractable content found in source");
      }

      // Route to chunk queue
      const chunkData: ChunkJobData = {
        sourceId,
        projectId,
        indexVersion,
        extractedData,
      };
      await queuesService.addChunkJob(sourceId, chunkData);

      logger.info(
        `[extract-worker] Done: sourceId=${sourceId}, items=${extractedData.length}`,
      );
      return { status: "success", items: extractedData.length };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[extract-worker] Failed: sourceId=${sourceId}`, { err: error });

      await db.source.update({
        where: { id: sourceId },
        data: { status: "failed", lastError: message },
      });
      await db.ingestionJob.updateMany({
        where: { sourceId, jobType: "ingest" },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
      throw error; // re-throw so BullMQ marks the job failed and can retry
    } finally {
      await cleanupTempDir(job.id ?? randomUUID());
    }
  },
  {
    connection: valkeyConnection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60_000, // max 10 jobs/min — protects DO Spaces bandwidth
    },
  },
);

extractWorker.on("failed", (job, err) => {
  logger.error(`[extract-worker] Job ${job?.id} permanently failed`, { err });
});
