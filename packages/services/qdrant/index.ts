import { logger } from "@repo/logger";
import { env } from "../env";

// ── Types ────────────────────────────────────────────────────────────────────

/** Full payload stored with each Qdrant point — matches docs/02-schema.md spec */
export interface QdrantPointPayload {
  chunkId: string;
  sourceId: string;
  leafId: string;
  indexVersion: number;
  content: string;
  pageNumber: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
  timestampLabel: string | null;
  sourceType: string;         // "file" | "link" | "text"
  fileName: string | null;
  subFileName: string | null;
  sourceUrl: string | null;
}

export interface QdrantPoint {
  id: string; // UUID — same as chunk.id (qdrantPointId)
  vector: number[];
  payload: QdrantPointPayload;
}

// ── Collection config ─────────────────────────────────────────────────────────
const VECTOR_SIZE = 1536;
const VECTOR_DISTANCE = "Cosine" as const;

/** Derive Qdrant collection name from a leaf UUID */
export function collectionName(leafId: string): string {
  return `project_${leafId.replace(/-/g, "_")}`;
}

// ── QdrantService ─────────────────────────────────────────────────────────────
export class QdrantService {
  private url: string;
  private headers: Record<string, string>;

  constructor() {
    this.url = env.QDRANT_URL.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
    };
    if (env.QDRANT_API_KEY) {
      this.headers["api-key"] = env.QDRANT_API_KEY;
    }
    logger.info(`[QdrantService] Initialized — url: ${this.url}`);
  }

  private async request(method: string, path: string, body?: any) {
    const res = await fetch(`${this.url}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Qdrant API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    return res.json();
  }

  /**
   * Idempotently create the Qdrant collection for a leaf.
   * Also creates payload indexes needed for delete-by-filter operations.
   */
  async ensureCollection(leafId: string): Promise<void> {
    const name = collectionName(leafId);
    try {
      await this.request("PUT", `/collections/${name}`, {
        vectors: { size: VECTOR_SIZE, distance: VECTOR_DISTANCE },
      });
      logger.info(`[QdrantService] Created collection: ${name}`);

      // Create payload indexes
      await this.request("PUT", `/collections/${name}/index`, { field_name: "sourceId", field_schema: "keyword" });
      await this.request("PUT", `/collections/${name}/index`, { field_name: "indexVersion", field_schema: "integer" });
      await this.request("PUT", `/collections/${name}/index`, { field_name: "leafId", field_schema: "keyword" });
    } catch (err: any) {
      if (err.message.includes("already exists")) {
        logger.debug(`[QdrantService] Collection ${name} already exists — skipping create`);
        return;
      }
      throw err;
    }
  }

  /**
   * Upsert a batch of vectors into the leaf's collection.
   */
  async upsertPoints(leafId: string, points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;
    const name = collectionName(leafId);

    await this.request("PUT", `/collections/${name}/points?wait=true`, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });

    logger.debug(`[QdrantService] Upserted ${points.length} points into ${name}`);
  }

  /**
   * Delete all points matching a filter.
   */
  async deleteByFilter(
    leafId: string,
    filter: { sourceId: string; indexVersionLt?: number },
  ): Promise<void> {
    const name = collectionName(leafId);
    const mustConditions: any[] = [{ key: "sourceId", match: { value: filter.sourceId } }];

    if (filter.indexVersionLt !== undefined) {
      mustConditions.push({ key: "indexVersion", range: { lt: filter.indexVersionLt } });
    }

    await this.request("POST", `/collections/${name}/points/delete?wait=true`, {
      filter: { must: mustConditions },
    });

    logger.info(`[QdrantService] Deleted points for sourceId=${filter.sourceId}`);
  }

  /**
   * Count points matching a filter.
   */
  async countByFilter(
    leafId: string,
    filter: { sourceId: string; indexVersion?: number },
  ): Promise<number> {
    const name = collectionName(leafId);
    const mustConditions: any[] = [{ key: "sourceId", match: { value: filter.sourceId } }];
    if (filter.indexVersion !== undefined) {
      mustConditions.push({ key: "indexVersion", match: { value: filter.indexVersion } });
    }

    const result = await this.request("POST", `/collections/${name}/points/count`, {
      filter: { must: mustConditions },
      exact: true,
    });

    return result.result.count;
  }

  /**
   * Search for similar vectors in a collection, with optional filters.
   */
  async search(
    leafId: string,
    params: {
      vector: number[];
      filter?: any;
      limit?: number;
      with_payload?: boolean;
    }
  ): Promise<QdrantPoint[]> {
    const name = collectionName(leafId);
    
    const result = await this.request("POST", `/collections/${name}/points/search`, {
      vector: params.vector,
      filter: params.filter,
      limit: params.limit || 20,
      with_payload: params.with_payload ?? true,
    });

    return result.result;
  }

  /**
   * Ping Qdrant — returns true if healthy.
   */
  async ping(): Promise<boolean> {
    try {
      await this.request("GET", "/collections");
      return true;
    } catch {
      return false;
    }
  }
}

export const qdrantService = new QdrantService();
