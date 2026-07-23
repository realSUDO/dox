import { router, publicProcedure, protectedProcedure } from "../../trpc";
import { authService, registerSchema, loginSchema, changePasswordSchema, userSchema } from "@repo/services";
import { z } from "zod";

export const authRouter = router({
  register: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/register" } })
    .input(registerSchema)
    .output(userSchema)
    .mutation(async ({ input, ctx }) => {
      const { user, rawToken } = await authService.register(input);

      ctx.res.cookie("session_token", rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return user;
    }),

  login: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/login" } })
    .input(loginSchema)
    .output(userSchema)
    .mutation(async ({ input, ctx }) => {
      const { user, rawToken } = await authService.login(input);

      ctx.res.cookie("session_token", rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return user;
    }),

  logout: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/auth/logout" } })
    .input(z.void())
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      if (ctx.req.cookies?.session_token) {
        await authService.logout(ctx.req.cookies.session_token);
      }
      ctx.res.clearCookie("session_token");
      return { success: true };
    }),

  logoutAll: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/auth/logoutAll" } })
    .input(z.void())
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      await authService.logoutAll(ctx.user.id);
      ctx.res.clearCookie("session_token");
      return { success: true };
    }),

  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/auth/me" } })
    .input(z.void())
    .output(userSchema)
    .query(async ({ ctx }) => {
      return ctx.user;
    }),

  changePassword: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/auth/changePassword" } })
    .input(changePasswordSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await authService.changePassword(ctx.user.id, input);
      ctx.res.clearCookie("session_token");
      return { success: true };
    }),
});
