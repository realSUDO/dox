import { router, protectedProcedure } from "../../trpc";
import { projectService, createProjectSchema } from "@repo/services";
import { z } from "zod";

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().uuid(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectsRouter = router({
  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/projects" } })
    .input(createProjectSchema)
    .output(projectSchema)
    .mutation(async ({ input, ctx }) => {
      return projectService.createProject(ctx.user.id, input);
    }),

  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/projects" } })
    .input(z.void())
    .output(z.array(projectSchema))
    .query(async ({ ctx }) => {
      return projectService.listProjects(ctx.user.id);
    }),

  get: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/projects/{id}" } })
    .input(z.object({ id: z.string().uuid() }))
    .output(projectSchema)
    .query(async ({ input, ctx }) => {
      return projectService.getProject(input.id, ctx.user.id);
    }),
});
