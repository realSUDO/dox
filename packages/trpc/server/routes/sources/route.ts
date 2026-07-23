import { router, protectedProcedure } from "../../trpc";
import {
  sourceService,
  uploadSourceSchema,
  addLinkSchema,
  addTextSchema,
} from "@repo/services";
import { z } from "zod";

const sourceSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  type: z.string(),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  fileSizeBytes: z.number().nullable(),
  storageKey: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  textContent: z.string().nullable(),
  status: z.string(),
  chunkCount: z.number().nullable(),
  indexedAt: z.date().nullable(),
  indexVersion: z.number(),
  lastError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const serializeSource = (s: any) => ({
  ...s,
  fileSizeBytes: s.fileSizeBytes != null ? Number(s.fileSizeBytes) : null,
});

export const sourcesRouter = router({
  requestUploadUrl: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/sources/requestUploadUrl" } })
    .input(uploadSourceSchema)
    .output(
      z.object({
        sourceId: z.string().uuid(),
        uploadUrl: z.string(),
        storageKey: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return sourceService.createPresignedUpload(ctx.user.id, input);
    }),

  confirmUpload: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/sources/{sourceId}/confirm" } })
    .input(z.object({ sourceId: z.string().uuid() }))
    .output(z.object({ sourceId: z.string().uuid(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return sourceService.confirmUpload(ctx.user.id, input.sourceId);
    }),

  addLink: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/sources/link" } })
    .input(addLinkSchema)
    .output(z.object({ sourceId: z.string().uuid(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return sourceService.addLink(ctx.user.id, input);
    }),

  addText: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/sources/text" } })
    .input(addTextSchema)
    .output(z.object({ sourceId: z.string().uuid(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return sourceService.addText(ctx.user.id, input);
    }),

  listSources: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/projects/{projectId}/sources" } })
    .input(z.object({ projectId: z.string().uuid() }))
    .output(z.array(sourceSchema))
    .query(async ({ input, ctx }) => {
      const sources = await sourceService.listSources(ctx.user.id, input.projectId);
      return sources.map(serializeSource);
    }),

  getSource: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/sources/{sourceId}" } })
    .input(z.object({ sourceId: z.string().uuid() }))
    .output(sourceSchema)
    .query(async ({ input, ctx }) => {
      const source = await sourceService.getSource(ctx.user.id, input.sourceId);
      return serializeSource(source);
    }),

  deleteSource: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/sources/{sourceId}" } })
    .input(z.object({ sourceId: z.string().uuid() }))
    .output(z.object({ sourceId: z.string().uuid(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return sourceService.deleteSource(ctx.user.id, input.sourceId);
    }),

  reindexSource: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/sources/{sourceId}/reindex" } })
    .input(z.object({ sourceId: z.string().uuid() }))
    .output(z.object({ sourceId: z.string().uuid(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return sourceService.reindexSource(ctx.user.id, input.sourceId);
    }),
});
