import { collectDefaultMetrics, Registry, Counter, Histogram, Gauge } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in ms",
  labelNames: ["method", "route", "status"],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

export const ingestionJobTotal = new Counter({
  name: "ingestion_job_total",
  help: "Total ingestion jobs",
  labelNames: ["status", "job_type"],
  registers: [registry],
});

export const embedTokensTotal = new Counter({
  name: "embed_tokens_total",
  help: "Total tokens sent to embedding API",
  registers: [registry],
});

export const generationTokensTotal = new Counter({
  name: "generation_tokens_total",
  help: "Total tokens used in generation",
  labelNames: ["model"],
  registers: [registry],
});

export const bullQueueSize = new Gauge({
  name: "bull_queue_size",
  help: "Current queue size",
  labelNames: ["queue", "state"],
  registers: [registry],
});

export const guardrailEventsTotal = new Counter({
  name: "guardrail_events_total",
  help: "Guardrail events",
  labelNames: ["stage", "rule", "action"],
  registers: [registry],
});

export const ragQueryDuration = new Histogram({
  name: "rag_query_duration_ms",
  help: "End-to-end RAG query duration",
  buckets: [500, 1000, 2000, 3000, 5000, 10000],
  registers: [registry],
});
