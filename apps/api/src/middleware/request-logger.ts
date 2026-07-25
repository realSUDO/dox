import { Request, Response, NextFunction } from "express";
import { logger } from "@repo/logger";
import { httpRequestDuration } from "../metrics";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status: res.statusCode },
      durationMs
    );

    // Skip logging healthcheck
    if (req.path === "/health" || req.path === "/metrics") return;

    logger.info(`HTTP ${req.method} ${req.path}`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      userAgent: req.headers["user-agent"],
    });
  });

  next();
}
