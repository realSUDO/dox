import { z } from "zod";
import { protectedProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { projectService, ragService, guardrailService } from "@repo/services";

export const chatRouter = router({
  query: protectedProcedure
    .input(
      z.object({
        leafId: z.string(),
        query: z.string().min(1).max(2000),
        chatSessionId: z.string().optional(),
        assistantMessageId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Assert membership
      await projectService.assertMembership(
        ctx.user.id,
        input.leafId,
        ["viewer", "editor", "owner"]
      );

      // 2. Check for Empty Knowledge Base state
      const sourceCount = await ctx.db.source.count({
        where: { leafId: input.leafId }
      });

      if (sourceCount === 0) {
        return ragService.emptyStateQuery({
          leafId: input.leafId,
          userId: ctx.user.id,
          query: input.query,
          chatSessionId: input.chatSessionId,
        });
      }

      // 3. Input Guardrails
      const guardrailInput = await guardrailService.checkInput(input.query, {
        userId: ctx.user.id,
        leafId: input.leafId,
      });

      if (!guardrailInput.allowed) {
        // Log detailed block reason for the user/admin
        console.error(`[Chat Route] Query blocked by guardrails for user ${ctx.user.id}. Query: "${input.query}". Events:`, JSON.stringify(guardrailInput.events, null, 2));
        
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Query blocked by content policy: " + guardrailInput.events.map(e => e.rule).join(", "),
        });
      }

      // 3. Pre-create DB messages if assistantMessageId provided
      let currentSessionId = input.chatSessionId;
      if (input.assistantMessageId) {
        if (!currentSessionId) {
          const session = await ctx.db.chatSession.create({
            data: { leafId: input.leafId, userId: ctx.user.id, title: input.query.substring(0, 50) }
          });
          currentSessionId = session.id;
        }

        // Insert user message
        await ctx.db.chatMessage.create({
          data: {
            chatSessionId: currentSessionId,
            role: "user",
            content: input.query,
          }
        });

        // Insert empty assistant message to track thought process
        await ctx.db.chatMessage.create({
          data: {
            id: input.assistantMessageId,
            chatSessionId: currentSessionId,
            role: "assistant",
            content: "",
            thoughtProcess: [],
          }
        });
      }

      // 4. Call RAG Pipeline
      try {
        const response = await ragService.query({
          leafId: input.leafId,
          userId: ctx.user.id,
          query: guardrailInput.sanitizedQuery,
          chatSessionId: currentSessionId,
          piiMap: guardrailInput.piiMap,
          originalQuery: input.query,
          assistantMessageId: input.assistantMessageId,
        });

        return response;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to process RAG query",
        });
      }
    }),

  getThoughtProcess: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const msg = await ctx.db.chatMessage.findUnique({
        where: { id: input.messageId },
        select: { thoughtProcess: true, content: true }
      });
      return msg;
    }),

  listSessions: protectedProcedure
    .input(z.object({ leafId: z.string() }))
    .query(async ({ ctx, input }) => {
      await projectService.assertMembership(
        ctx.user.id,
        input.leafId,
        ["viewer", "editor", "owner"]
      );

      const sessions = await ctx.db.chatSession.findMany({
        where: { leafId: input.leafId, userId: ctx.user.id },
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
        leafId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await projectService.assertMembership(
        ctx.user.id,
        input.leafId,
        ["viewer", "editor", "owner"]
      );

      const session = await ctx.db.chatSession.create({
        data: {
          leafId: input.leafId,
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
