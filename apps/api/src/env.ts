import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "prod"]).default("development"),
  BASE_URL: z.string().default("http://localhost:8000"),

  // DigitalOcean Spaces (S3-compatible object storage)
  SPACES_ENDPOINT: z.string().optional(),
  SPACES_REGION: z.string().optional(),
  SPACES_KEY: z.string().optional(),
  SPACES_SECRET: z.string().optional(),
  SPACES_BUCKET: z.string().optional(),

  // Postgres
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Valkey / Redis
  VALKEY_URL: z.string().default("redis://127.0.0.1:6379"),

  // OpenAI-compatible
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_API_BASE: z.string().url().optional(),

  // Qdrant
  QDRANT_URL: z.string().url().default("http://127.0.0.1:6333"),
  QDRANT_API_KEY: z.string().optional(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    throw new Error(
      `[api] Invalid environment variables:\n${safeParseResult.error.message}`,
    );
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);

