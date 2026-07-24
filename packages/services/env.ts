import { z } from "zod";

const envSchema = z.object({
  // Queue / cache
  VALKEY_URL: z.string().default("redis://127.0.0.1:6379"),

  // OpenAI-compatible embedding/generation
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_API_BASE: z.string().url().optional(),

  // Qdrant vector DB
  QDRANT_URL: z.string().url().default("http://127.0.0.1:6333"),
  QDRANT_API_KEY: z.string().optional(),

  // Embedding config
  EMBED_MODEL: z.string().default("text-embedding-3-small"),
  FAST_LLM_MODEL: z.string().default("gpt-4o-mini"),
  EMBED_BATCH_SIZE: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 100)),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    throw new Error(
      `[services] Invalid environment variables:\n${safeParseResult.error.message}`,
    );
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);

