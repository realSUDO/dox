import { z } from "zod";
import { adminProcedure, router } from "../../trpc";
import { adminService } from "../../services";

export const adminRouter = router({
  listGuardrailEvents: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        leafId: z.string().optional(),
        rule: z.string().optional(),
        action: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      
      const where: any = {};
      if (input.userId) where.userId = input.userId;
      if (input.leafId) where.leafId = input.leafId;
      if (input.rule) where.rule = input.rule;
      if (input.action) where.action = input.action;

      const [events, total] = await Promise.all([
        ctx.db.guardrailEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip,
        }),
        ctx.db.guardrailEvent.count({ where }),
      ]);

      return {
        events,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  getSystemHealth: adminProcedure.query(async () => {
    return await adminService.getSystemHealth();
  }),

  listActiveJobs: adminProcedure.query(async () => {
    return await adminService.listActiveJobs();
  }),

  listFailedJobs: adminProcedure.query(async () => {
    return await adminService.listFailedJobs();
  }),

  getJobsBySource: adminProcedure
    .input(z.object({ sourceId: z.string() }))
    .query(async ({ input }) => {
      return await adminService.getJobsBySource(input.sourceId);
    }),

  retryJob: adminProcedure
    .input(z.object({ queueName: z.string(), jobId: z.string() }))
    .mutation(async ({ input }) => {
      return await adminService.retryJob(input.queueName, input.jobId);
    }),

  getMetricsSummary: adminProcedure.query(async () => {
    return await adminService.getMetricsSummary();
  }),

  getIngestionStats: adminProcedure.query(async () => {
    return await adminService.getIngestionStats();
  }),

  getRAGStats: adminProcedure.query(async () => {
    return await adminService.getRAGStats();
  }),
});
