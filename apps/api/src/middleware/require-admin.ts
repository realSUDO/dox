import { Request, Response, NextFunction } from "express";
import { parseCookie } from "cookie";
import { authService } from "@repo/services";
import { logger } from "@repo/logger";

export async function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let session_token: string | undefined;

    if (req.cookies && req.cookies.session_token) {
      session_token = req.cookies.session_token;
    } else if (req.headers.cookie) {
      const cookies = parseCookie(req.headers.cookie);
      session_token = cookies.session_token;
    }

    if (!session_token) {
      res.status(401).send("Unauthorized: Missing session token");
      return;
    }

    const authState = await authService.validateSession(session_token);
    
    if (!authState || !authState.user) {
      res.status(401).send("Unauthorized: Invalid session");
      return;
    }

    if (authState.user.role !== "admin") {
      res.status(403).send("Forbidden: Requires admin role");
      return;
    }

    // Attach user to req for downstream usage if needed
    (req as any).user = authState.user;
    next();
  } catch (error) {
    logger.error("Failed to authenticate admin session", { err: error });
    res.status(500).send("Internal Server Error");
  }
}
