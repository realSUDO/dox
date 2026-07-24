import { env } from "./env";

/**
 * Shared Valkey/Redis connection config for all BullMQ queues and workers.
 * Single source of truth — no more scattered `process.env.VALKEY_URL` across 6 files.
 */
export const valkeyConnection = {
  url: env.VALKEY_URL,
};

