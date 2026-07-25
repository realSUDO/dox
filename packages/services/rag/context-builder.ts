import { RerankedChunk } from "./reranker";
import { logger } from "@repo/logger";

export interface AssembledContext {
  contextString: string;
  sourceMap: Map<number, RerankedChunk>; // Maps [Source N] index to the actual chunk
}

export class ContextBuilder {
  /**
   * Assembles the LLM context string from the passed chunks.
   * Also builds a map of the citation indices to the original chunks.
   */
  build(chunks: RerankedChunk[]): AssembledContext {
    let contextString = "";
    const sourceMap = new Map<number, RerankedChunk>();

    logger.debug(`[ContextBuilder] Assembling context for ${chunks.length} chunks`);

    chunks.forEach((chunk, index) => {
      const sourceIndex = index + 1; // 1-indexed for [Source N]
      sourceMap.set(sourceIndex, chunk);

      let sourceTitle = chunk.subFileName || chunk.fileName || chunk.sourceUrl || "Pasted text";
      let sourceTypeLabel = "Document";
      
      if (chunk.startSeconds !== null || chunk.timestampLabel) {
        sourceTypeLabel = "Timed Media";
        
        // Extract generic hierarchical metadata from the path structure instead of assuming 'module'
        if (chunk.subFileName) {
          const parts = chunk.subFileName.split('/').filter(Boolean);
          const filename = parts.pop() || "";
          // Clean title by removing extension and noisy suffixes
          let title = filename.replace(/\.(srt|vtt)$/i, '').replace(/_epm$/, '');
          
          let hierarchyContext = "";
          // If there are parent directories (like 'module 4' or 'Section 1'), include them naturally
          // but skip the root folder name if it's generic (like 'class-subtitle')
          if (parts.length > 0) {
            // Take the last 2 parent directories to avoid overly long strings
            const relevantParents = parts.slice(-2);
            if (relevantParents.length > 0) {
              hierarchyContext = ` (${relevantParents.join(" > ")})`;
            }
          }
          
          sourceTitle = `"${title}"${hierarchyContext}`;
        }
      }

      let location = "";
      if (chunk.pageNumber) {
        location = `Page ${chunk.pageNumber}`;
      } else if (chunk.timestampLabel) {
        location = `at ${chunk.timestampLabel} in this video`;
      }

      contextString += `[Source ${sourceIndex}: ${sourceTypeLabel} — ${sourceTitle}]\n`;
      if (location) {
        contextString += `[Location: ${location}]\n`;
      }
      
      // Strip noisy [Project Summary...] and [File Path...] that chunk worker baked in, as we now provide better headers
      let cleanContent = chunk.content;
      cleanContent = cleanContent.replace(/\[Project Summary:.*?\]\n\n/s, "");
      cleanContent = cleanContent.replace(/\[File Path:.*?\]\n\n/s, "");

      contextString += `---\n${cleanContent}\n---\n\n`;
    });

    logger.info(`[ContextBuilder] Final context string:\n${contextString.trim()}`);
    return {
      contextString: contextString.trim(),
      sourceMap,
    };
  }
}

export const contextBuilder = new ContextBuilder();
