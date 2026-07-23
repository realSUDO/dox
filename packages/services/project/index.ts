import { db } from "@repo/database";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export class ProjectService {
  async createProject(userId: string, input: CreateProjectInput) {
    const project = await db.project.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: "owner",
          },
        },
      },
    });
    return project;
  }

  async listProjects(userId: string) {
    const projects = await db.project.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return projects;
  }

  async getProject(projectId: string, userId: string) {
    await this.assertMembership(userId, projectId, ["viewer", "editor", "owner"]);

    const project = await db.project.findUnique({
      where: { id: projectId, status: "active" },
    });

    if (!project) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    return project;
  }

  async assertMembership(userId: string, projectId: string, allowedRoles: string[]) {
    const membership = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this project.",
      });
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have the required permissions for this project.",
      });
    }

    return membership;
  }
}

export const projectService = new ProjectService();
