import { db } from "@repo/database";
import { TRPCError } from "@trpc/server";
import { spacesService } from "../spaces";
import { queuesService } from "../queues";
import { projectService } from "../project";
import { z } from "zod";
import crypto from "node:crypto";

export const uploadSourceSchema = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().max(255).regex(/^[a-zA-Z0-9-_\.]+$/, "Invalid characters in filename"),
  mimeType: z.enum([
    "application/pdf",
    "text/plain",
    "application/x-subrip",
    "text/vtt",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/zip",
  ]),
  fileSizeBytes: z.number().max(52428800), // 50MB
});

export const addLinkSchema = z.object({
  projectId: z.string().uuid(),
  url: z
    .string()
    .url()
    .refine((url) => {
      // Basic check for private IPs
      return !url.includes("127.") && !url.includes("10.") && !url.includes("192.168.") && !url.includes("localhost");
    }, "Invalid URL"),
});

export const addTextSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().max(100000),
  title: z.string().max(255).optional(),
});

export type UploadSourceInput = z.infer<typeof uploadSourceSchema>;
export type AddLinkInput = z.infer<typeof addLinkSchema>;
export type AddTextInput = z.infer<typeof addTextSchema>;

export class SourceService {
  async createPresignedUpload(userId: string, input: UploadSourceInput) {
    await projectService.assertMembership(userId, input.projectId, ["editor", "owner"]);

    const sourceId = crypto.randomUUID();
    const storageKey = `projects/${input.projectId}/sources/${sourceId}/${input.fileName}`;

    const uploadUrl = await spacesService.createPresignedPutUrl(storageKey, input.mimeType);

    const source = await db.source.create({
      data: {
        id: sourceId,
        projectId: input.projectId,
        uploadedBy: userId,
        type: "file",
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        storageKey: storageKey,
        status: "pending_upload",
      },
    });

    return { sourceId: source.id, uploadUrl, storageKey };
  }

  async confirmUpload(userId: string, sourceId: string) {
    const source = await db.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
    }

    await projectService.assertMembership(userId, source.projectId, ["editor", "owner"]);

    if (source.status !== "pending_upload") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Source is not pending upload" });
    }

    const updatedSource = await db.source.update({
      where: { id: sourceId },
      data: { status: "queued" },
    });

    await db.ingestionJob.create({
      data: {
        sourceId,
        jobType: "ingest",
        status: "queued",
      },
    });

    await queuesService.addExtractJob(`extract-${sourceId}-v${updatedSource.indexVersion}`, {
      sourceId,
      projectId: source.projectId,
      jobType: "ingest",
      indexVersion: updatedSource.indexVersion,
    });

    return { sourceId, status: updatedSource.status };
  }

  async addLink(userId: string, input: AddLinkInput) {
    await projectService.assertMembership(userId, input.projectId, ["editor", "owner"]);

    const source = await db.source.create({
      data: {
        projectId: input.projectId,
        uploadedBy: userId,
        type: "link",
        sourceUrl: input.url,
        status: "queued",
      },
    });

    await db.ingestionJob.create({
      data: {
        sourceId: source.id,
        jobType: "ingest",
        status: "queued",
      },
    });

    await queuesService.addExtractJob(`extract-${source.id}-v${source.indexVersion}`, {
      sourceId: source.id,
      projectId: source.projectId,
      jobType: "ingest",
      indexVersion: source.indexVersion,
    });

    return { sourceId: source.id, status: source.status };
  }

  async addText(userId: string, input: AddTextInput) {
    await projectService.assertMembership(userId, input.projectId, ["editor", "owner"]);

    const source = await db.source.create({
      data: {
        projectId: input.projectId,
        uploadedBy: userId,
        type: "text",
        textContent: input.content,
        fileName: input.title,
        status: "queued",
      },
    });

    await db.ingestionJob.create({
      data: {
        sourceId: source.id,
        jobType: "ingest",
        status: "queued",
      },
    });

    await queuesService.addExtractJob(`extract-${source.id}-v${source.indexVersion}`, {
      sourceId: source.id,
      projectId: source.projectId,
      jobType: "ingest",
      indexVersion: source.indexVersion,
    });

    return { sourceId: source.id, status: source.status };
  }

  async listSources(userId: string, projectId: string) {
    await projectService.assertMembership(userId, projectId, ["viewer", "editor", "owner"]);

    return db.source.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getSource(userId: string, sourceId: string) {
    const source = await db.source.findUnique({
      where: { id: sourceId },
    });

    if (!source || source.deletedAt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
    }

    await projectService.assertMembership(userId, source.projectId, ["viewer", "editor", "owner"]);

    return source;
  }

  async deleteSource(userId: string, sourceId: string) {
    const source = await db.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
    }

    await projectService.assertMembership(userId, source.projectId, ["editor", "owner"]);

    const updatedSource = await db.source.update({
      where: { id: sourceId },
      data: { deletedAt: new Date() },
    });

    await db.ingestionJob.create({
      data: {
        sourceId,
        jobType: "delete_vectors",
        status: "queued",
      },
    });

    await queuesService.addCleanupJob(`cleanup-${sourceId}-v${updatedSource.indexVersion}`, {
      sourceId,
      projectId: source.projectId,
      jobType: "delete_vectors",
      indexVersion: updatedSource.indexVersion,
    });

    return { sourceId, status: "deleted" };
  }

  async reindexSource(userId: string, sourceId: string) {
    const source = await db.source.findUnique({
      where: { id: sourceId },
    });

    if (!source || source.deletedAt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
    }

    await projectService.assertMembership(userId, source.projectId, ["editor", "owner"]);

    if (source.status !== "indexed" && source.status !== "failed") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Source must be indexed or failed to reindex" });
    }

    const updatedSource = await db.source.update({
      where: { id: sourceId },
      data: {
        status: "reindex_queued",
        indexVersion: { increment: 1 },
      },
    });

    await db.ingestionJob.create({
      data: {
        sourceId,
        jobType: "reindex",
        status: "queued",
      },
    });

    await queuesService.addReindexJob(`reindex-${sourceId}-v${updatedSource.indexVersion}`, {
      sourceId,
      projectId: source.projectId,
      jobType: "reindex",
      indexVersion: updatedSource.indexVersion,
    });

    return { sourceId, status: updatedSource.status };
  }
}

export const sourceService = new SourceService();
