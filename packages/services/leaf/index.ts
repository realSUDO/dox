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
    const leaf = await db.leaf.create({
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
    return leaf;
  }

  async listProjects(userId: string) {
    const leafs = await db.leaf.findMany({
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
    return leafs;
  }

  async getProject(leafId: string, userId: string) {
    await this.assertMembership(userId, leafId, ["viewer", "editor", "owner"]);

    const leaf = await db.leaf.findUnique({
      where: { id: leafId, status: "active" },
    });

    if (!leaf) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Leaf not found",
      });
    }

    return leaf;
  }

  async assertMembership(userId: string, leafId: string, allowedRoles: string[]) {
    const membership = await db.leafMember.findUnique({
      where: {
        leafId_userId: {
          leafId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this leaf.",
      });
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have the required permissions for this leaf.",
      });
    }

    return membership;
  }
}

export const projectService = new ProjectService();
