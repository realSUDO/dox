import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    throw new Error("Invalid env variables in packages/database: " + safeParseResult.error.message);
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);
