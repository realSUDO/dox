import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { extractQueue, embedQueue, ocrQueue } from "@repo/services/queues";

import { requestIdMiddleware } from "./middleware/request-id";
import { requestLoggerMiddleware } from "./middleware/request-logger";
import { requireAdminMiddleware } from "./middleware/require-admin";
import { basicAuthMiddleware } from "./middleware/basic-auth";
import { registry } from "./metrics";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";

export const app = express();

const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "API",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

if (env.NODE_ENV !== "prod") {
  app.use(
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000", env.BASE_URL],
      credentials: true,
    }),
  );
}

app.use(express.json());
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Set up Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [
    new BullMQAdapter(extractQueue),
    new BullMQAdapter(embedQueue),
    new BullMQAdapter(ocrQueue),
  ],
  serverAdapter,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests, please try again later." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many requests, please try again later." },
});

app.use("/trpc/auth.login", authLimiter);
app.use("/api/auth/login", authLimiter);

app.use("/trpc/auth.register", registerLimiter);
app.use("/api/auth/register", registerLimiter);

app.get("/", (req, res) => {
  return res.json({ message: "Server is up and running" });
});

app.get("/health", (req, res) => {
  return res.json({ status: "healthy" });
});

app.get("/metrics", basicAuthMiddleware, async (req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

app.use("/admin/queues", requireAdminMiddleware, serverAdapter.getRouter());

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
