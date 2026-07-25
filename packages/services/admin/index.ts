import { db } from "@repo/database";
import { qdrantService } from "../qdrant";
import { extractQueue, embedQueue, ocrQueue } from "../queues";
import { Job } from "bullmq";

export class AdminService {
  async getSystemHealth() {
    const health = {
      postgres: { status: "unknown", error: "" },
      qdrant: { status: "unknown", error: "" },
      valkey: { status: "unknown", error: "" },
    };

    // Ping Postgres
    try {
      await db.$queryRaw`SELECT 1`;
      health.postgres.status = "healthy";
    } catch (err: any) {
      health.postgres.status = "unhealthy";
      health.postgres.error = err.message;
    }

    // Ping Qdrant
    try {
      const qdrantHealthy = await qdrantService.ping();
      health.qdrant.status = qdrantHealthy ? "healthy" : "unhealthy";
    } catch (err: any) {
      health.qdrant.status = "unhealthy";
      health.qdrant.error = err.message;
    }

    // Ping Valkey (Redis)
    try {
      const client = await extractQueue.client;
      const pong = await (client as any).ping();
      health.valkey.status = pong === "PONG" ? "healthy" : "unhealthy";
    } catch (err: any) {
      health.valkey.status = "unhealthy";
      health.valkey.error = err.message;
    }

    return health;
  }

  async listActiveJobs() {
    const [ingest, embed, ocr] = await Promise.all([
      extractQueue.getJobs(["active", "waiting"]),
      embedQueue.getJobs(["active", "waiting"]),
      ocrQueue.getJobs(["active", "waiting"]),
    ]);

    return {
      ingestion: ingest.map(this.formatJob),
      embed: embed.map(this.formatJob),
      ocr: ocr.map(this.formatJob),
    };
  }

  async listFailedJobs() {
    const [ingest, embed, ocr] = await Promise.all([
      extractQueue.getJobs(["failed"]),
      embedQueue.getJobs(["failed"]),
      ocrQueue.getJobs(["failed"]),
    ]);

    // Also get DB records for context
    const dbJobs = await db.ingestionJob.findMany({
      where: { status: "failed" },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: { source: { select: { fileName: true } } }
    });

    return {
      bullmq: {
        ingestion: ingest.map(this.formatJob),
        embed: embed.map(this.formatJob),
        ocr: ocr.map(this.formatJob),
      },
      db: dbJobs,
    };
  }

  async getJobsBySource(sourceId: string) {
    return await db.ingestionJob.findMany({
      where: { sourceId },
      orderBy: { createdAt: "desc" },
    });
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = 
      queueName === "extract-queue" ? extractQueue :
      queueName === "embed-queue" ? embedQueue :
      queueName === "ocr-queue" ? ocrQueue : null;
      
    if (!queue) throw new Error("Invalid queue name");

    const job = await queue.getJob(jobId);
    if (!job) throw new Error("Job not found");

    await job.retry();
    return { success: true, jobId };
  }

  async getMetricsSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sourcesTotal, sourcesIndexed, sourcesFailed, queriesToday, guardrailEventsToday] = await Promise.all([
      db.source.count(),
      db.source.count({ where: { status: "indexed" } }),
      db.source.count({ where: { status: "failed" } }),
      db.chatMessage.count({ where: { role: "user", createdAt: { gte: today } } }),
      db.guardrailEvent.count({ where: { createdAt: { gte: today } } }),
    ]);

    return {
      sources: { total: sourcesTotal, indexed: sourcesIndexed, failed: sourcesFailed },
      queriesToday,
      guardrailEventsToday
    };
  }

  async getIngestionStats() {
    const jobs = await db.ingestionJob.findMany({
      where: { status: "completed", startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    if (jobs.length === 0) return { p50: null, p95: null };

    const durations = jobs.map(j => j.completedAt!.getTime() - j.startedAt!.getTime()).sort((a, b) => a - b);
    
    return {
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
    };
  }

  async getRAGStats() {
    const queries = await db.chatMessage.findMany({
      where: { role: "user" },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    
    // In our simplified setup we don't have explicit RAG duration in DB.
    // For MVP, return mock or null since we didn't add duration column to chat_messages.
    // We do have it in prometheus metrics, but extracting percentiles requires querying Prometheus.
    return { p50: null, p95: null, note: "Check /metrics endpoint for accurate RAG histograms" };
  }

  private formatJob(job: Job) {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
    };
  }
}

export const adminService = new AdminService();
