/**
 * Typed discriminated unions for all BullMQ job data payloads.
 * Workers MUST use these types — no `any` in job payloads.
 */

// ─── Extract Worker ───────────────────────────────────────────────
export interface ExtractJobData {
  sourceId: string;
  projectId: string;
  jobType: "ingest" | "reindex";
  indexVersion: number;
}

// ─── OCR Worker ───────────────────────────────────────────────────
export interface OcrJobData {
  sourceId: string;
  projectId: string;
  indexVersion: number;
  filePath: string;
}

// ─── Chunk Worker ─────────────────────────────────────────────────
export type ExtractedPdfData = {
  type: "pdf";
  pages: Array<{ pageNumber: number; text: string }>;
};

export type ExtractedSrtData = {
  type: "srt";
  cues: Array<{
    startSeconds: number;
    endSeconds: number;
    timestampLabel: string;
    text: string;
  }>;
};

export type ExtractedVttData = {
  type: "vtt";
  cues: Array<{
    startSeconds: number;
    endSeconds: number;
    timestampLabel: string;
    text: string;
  }>;
};

export type ExtractedTextData = {
  type: "text";
  text: string;
};

export type ExtractedItem = (
  | ExtractedPdfData
  | ExtractedSrtData
  | ExtractedVttData
  | ExtractedTextData
) & {
  fileName?: string;
};

export interface ChunkJobData {
  sourceId: string;
  projectId: string;
  indexVersion: number;
  extractedData: ExtractedItem[];
}

// ─── Cleanup Worker ───────────────────────────────────────────────
export interface CleanupJobData {
  sourceId: string;
  projectId: string;
  jobType: "delete_vectors";
  /** If provided, deletes only chunks with indexVersion < this value (stale after reindex).
   *  If undefined, deletes ALL chunks for the source (full source deletion). */
  indexVersion?: number;
}

// ─── Reindex Worker ───────────────────────────────────────────────
export interface ReindexJobData {
  sourceId: string;
  projectId: string;
  jobType: "reindex";
  indexVersion: number; // the NEW version
}

// ─── Embed Worker ─────────────────────────────────────────────────
export interface EmbedBatchJobData {
  sourceId: string;
  projectId: string;
  indexVersion: number;
  chunkIds: string[];
}
