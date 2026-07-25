import { z } from "zod";
import { protectedProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { projectService, ragService, guardrailService } from "@repo/services";

export const chatRouter = router({
  query: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        query: z.string().min(1).max(2000),
        chatSessionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Assert membership
      await projectService.assertMembership(
        ctx.user.id,
        input.projectId,
        ["viewer", "editor", "owner"]
      );

      // 2. Input Guardrails
      const guardrailInput = await guardrailService.checkInput(input.query, {
        userId: ctx.user.id,
        projectId: input.projectId,
      });

      if (!guardrailInput.allowed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Query blocked by content policy",
        });
      }

      // 3. Call RAG Pipeline
      try {
        const response = await ragService.query({
          projectId: input.projectId,
          userId: ctx.user.id,
          query: guardrailInput.sanitizedQuery,
          chatSessionId: input.chatSessionId,
          piiMap: guardrailInput.piiMap,
          originalQuery: input.query,
        });

        return response;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to process RAG query",
        });
      }
    }),

  listSessions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await projectService.assertMembership(
        ctx.user.id,
        input.projectId,
        ["viewer", "editor", "owner"]
      );

      const sessions = await ctx.db.chatSession.findMany({
        where: { projectId: input.projectId, userId: ctx.user.id },
        orderBy: { updatedAt: "desc" },
      });

      return sessions;
    }),

  getSession: protectedProcedure
    .input(z.object({ chatSessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.chatSession.findUnique({
        where: { id: input.chatSessionId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { citations: true },
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      if (session.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your session" });
      }

      return session;
    }),

  createSession: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await projectService.assertMembership(
        ctx.user.id,
        input.projectId,
        ["viewer", "editor", "owner"]
      );

      const session = await ctx.db.chatSession.create({
        data: {
          projectId: input.projectId,
          userId: ctx.user.id,
          title: input.title || "New Chat",
        },
      });

      return session;
    }),

  deleteSession: protectedProcedure
    .input(z.object({ chatSessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.chatSession.findUnique({
        where: { id: input.chatSessionId },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      if (session.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your session" });
      }

      await ctx.db.chatSession.delete({
        where: { id: input.chatSessionId },
      });

      return { success: true };
    }),
});
