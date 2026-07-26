import { qdrantService, QdrantPoint } from "../qdrant";
import { db } from "@repo/database";
import { embeddingService } from "../embedding";
import { logger } from "@repo/logger";

export interface RetrievedChunk {
  chunkId: string;
  sourceId: string;
  content: string;
  pageNumber: number | null;
  startSeconds: number | null;
  timestampLabel: string | null;
  fileName: string | null;
  subFileName: string | null;
  sourceUrl: string | null;
  score: number;
}

export class Retriever {
  /**
   * Hybrid retrieval using Qdrant (dense) and Postgres (sparse/FTS).
   */
  async retrieve(
    leafId: string,
    queries: string[],
    limit: number = 20
  ): Promise<RetrievedChunk[][]> {
    logger.debug(`[Retriever] Retrieving for ${queries.length} queries, limit=${limit}`);

    // Deduplicate the queries
    const uniqueQueries = [...new Set(queries)];

    // Fire all embedding requests in parallel
    const embeddings = await Promise.all(
      uniqueQueries.map((q) => embeddingService.embedBatch([q]))
    );

    // Fire all search requests in parallel
    const searchPromises: Promise<RetrievedChunk[]>[] = [];

    // 1. Qdrant Dense Search
    for (let i = 0; i < uniqueQueries.length; i++) {
      const vector = embeddings[i]?.[0];
      if (!vector) continue;

      searchPromises.push(
        qdrantService.search(leafId, {
          vector,
          limit,
          filter: {
            must: [{ key: "leafId", match: { value: leafId } }],
          },
        }).then(points => points.map(p => ({
          chunkId: p.payload.chunkId,
          sourceId: p.payload.sourceId,
          content: p.payload.content,
          pageNumber: p.payload.pageNumber,
          startSeconds: p.payload.startSeconds,
          timestampLabel: p.payload.timestampLabel,
          fileName: p.payload.fileName,
          subFileName: p.payload.subFileName,
          sourceUrl: p.payload.sourceUrl,
          score: (p as any).score || 0, // Ensure we map the cosine similarity score
        } as RetrievedChunk)))
      );
    }

    // 2. Postgres FTS Sparse Search
    for (const query of uniqueQueries) {
      searchPromises.push(
        db.$queryRaw`
          SELECT 
            c.id as "chunkId",
            c.source_id as "sourceId",
            c.content as content,
            c.page_number as "pageNumber",
            c.start_seconds as "startSeconds",
            c.timestamp_label as "timestampLabel",
            s.file_name as "fileName",
            c.sub_file_name as "subFileName",
            s.source_url as "sourceUrl",
            ts_rank_cd(c.content_tsv, plainto_tsquery('english', ${query})) AS score
          FROM chunks c
          JOIN sources s ON s.id = c.source_id
          WHERE c.leaf_id = ${leafId}
            AND c.status = 'indexed'
            AND c.content_tsv @@ plainto_tsquery('english', ${query})
          ORDER BY score DESC
          LIMIT ${limit};
        `.then((rows: any) => rows.map((r: any) => ({
          ...r,
          score: Number(r.score) // Normalize pg numeric
        })))
      );
    }

    const allResultsGroups = await Promise.all(searchPromises);
    
    // Return the array of lists so RRF can rank them independently
    return allResultsGroups;
  }
}

export const retriever = new Retriever();
