import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const getTempDir = (jobId: string) => path.join(os.tmpdir(), "ingestion", jobId);

export async function createTempDir(jobId: string) {
  const dir = getTempDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function cleanupTempDir(jobId: string) {
  const dir = getTempDir(jobId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}
