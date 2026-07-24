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

    await queuesService.addExtractJob(sourceId, {
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

    await queuesService.addExtractJob(source.id, {
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

    await queuesService.addExtractJob(source.id, {
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

    await queuesService.addCleanupJob(sourceId, {
      sourceId,
      projectId: source.projectId,
      jobType: "delete_vectors",
      // No indexVersion = full source deletion
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

    await queuesService.addReindexJob(sourceId, {
      sourceId,
      projectId: source.projectId,
      jobType: "reindex",
      indexVersion: updatedSource.indexVersion,
    });

    return { sourceId, status: updatedSource.status };
  }

  /**
   * Approve a source that is paused in 'pending_approval' state.
   * This transitions the source to 'embedding' and enqueues all its chunks for vector embedding.
   */
  async approveSource(userId: string, sourceId: string) {
    const source = await db.source.findUnique({
      where: { id: sourceId },
      include: { project: { include: { members: true } } },
    });

    if (!source) throw new Error("Source not found");

    // Only owners/editors can approve
    const isOwner = source.project.ownerId === userId;
    const isMemberEditor = source.project.members.some(
      (m) => m.userId === userId && ["editor", "owner"].includes(m.role),
    );
    if (!isOwner && !isMemberEditor) {
      throw new Error("Unauthorized to approve source ingestion");
    }

    if (source.status !== "pending_approval") {
      throw new Error(`Cannot approve source in status: ${source.status}`);
    }

    // 1. Fetch pending chunk IDs
    const chunkRecords = await db.chunk.findMany({
      where: { sourceId, indexVersion: source.indexVersion, status: "pending" },
      select: { id: true },
      orderBy: { chunkIndex: "asc" },
    });

    if (chunkRecords.length === 0) {
      // If no chunks, mark as indexed immediately
      await db.source.update({
        where: { id: sourceId },
        data: { status: "indexed", indexedAt: new Date(), chunkCount: 0 },
      });
      await db.ingestionJob.create({
        data: {
          sourceId,
          jobType: "embed",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
      return { sourceId, status: "indexed" };
    }

    // 2. Create ingestion job for embedding
    await db.ingestionJob.create({
      data: {
        sourceId,
        jobType: "embed",
        status: "active",
        startedAt: new Date(),
      },
    });

    // 3. Dispatch embed jobs in batches of 100
    const EMBED_BATCH_SIZE = 100;
    for (let i = 0; i < chunkRecords.length; i += EMBED_BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + EMBED_BATCH_SIZE);
      const batchIndex = Math.floor(i / EMBED_BATCH_SIZE);
      await queuesService.addEmbedJob(sourceId, batchIndex, {
        sourceId,
        projectId: source.projectId,
        indexVersion: source.indexVersion,
        chunkIds: batch.map((c) => c.id),
      });
    }

    // 4. Update status ONLY after successfully queueing
    await db.source.update({
      where: { id: sourceId },
      data: { status: "embedding" },
    });

    return { sourceId, status: "embedding", batches: Math.ceil(chunkRecords.length / EMBED_BATCH_SIZE) };
  }
}


export const sourceService = new SourceService();
