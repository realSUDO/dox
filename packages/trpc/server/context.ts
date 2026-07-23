import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { authService } from "./services";
import { parseCookie } from "cookie";
import { db } from "@repo/database";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  let session_token: string | undefined;

  // Prefer cookie-parser output if available
  if (req.cookies && req.cookies.session_token) {
    session_token = req.cookies.session_token;
  } else if (req.headers.cookie) {
    // Fallback to manual parsing
    const cookies = parseCookie(req.headers.cookie);
    session_token = cookies.session_token;
  }

  const authState = session_token ? await authService.validateSession(session_token) : null;

  return {
    db,
    user: authState?.user ?? null,
    session: authState?.session ?? null,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
