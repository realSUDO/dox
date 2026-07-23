import { db } from "@repo/database";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { RegisterInput, LoginInput, ChangePasswordInput, AuthSession, AuthUser } from "./types";
import { TRPCError } from "@trpc/server";

export class AuthService {
  private static readonly HASH_COST = 12;
  private static readonly SESSION_DURATION_DAYS = 30;
  private static readonly SLIDING_WINDOW_DAYS = 7;

  private hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  private generateRawToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async register(input: RegisterInput): Promise<{ user: AuthUser; rawToken: string }> {
    const existing = await db.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(input.password, AuthService.HASH_COST);

    const user = await db.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName || null,
        role: "user", // Default role
      },
    });

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + AuthService.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db.session.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      rawToken,
    };
  }

  async login(input: LoginInput): Promise<{ user: AuthUser; rawToken: string }> {
    const user = await db.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + AuthService.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db.session.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      rawToken,
    };
  }

  async validateSession(rawToken: string): Promise<{ session: AuthSession; user: AuthUser } | null> {
    const tokenHash = this.hashToken(rawToken);

    const session = await db.session.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await db.session.delete({ where: { id: session.id } });
      return null;
    }

    // Sliding window logic: If less than 7 days left, extend by 30 days
    const timeRemaining = session.expiresAt.getTime() - Date.now();
    const slidingWindowMs = AuthService.SLIDING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (timeRemaining < slidingWindowMs) {
      const newExpiresAt = new Date(Date.now() + AuthService.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
      await db.session.update({
        where: { id: session.id },
        data: { expiresAt: newExpiresAt },
      });
      session.expiresAt = newExpiresAt;
    }

    return {
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        role: session.user.role,
      },
    };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await db.session.delete({
      where: { token: tokenHash },
    }).catch(() => {
      // Ignore if session already deleted or doesn't exist
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await db.session.deleteMany({
      where: { userId },
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid current password",
      });
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, AuthService.HASH_COST);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Logout all existing sessions
    await this.logoutAll(userId);
  }
}

export const authService = new AuthService();
