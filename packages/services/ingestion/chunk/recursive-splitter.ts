export interface SplitterChunk {
  text: string;
  pageNumber?: number;
}

interface SourceText {
  text: string;
  pageNumber?: number;
}

export function chunkRecursiveSplitter(
  sources: SourceText[],
  maxTokens = 512,
  overlapTokens = 64
): SplitterChunk[] {
  // Simple heuristic: 1 token ~= 4 characters
  const MAX_CHARS = maxTokens * 4;
  const OVERLAP_CHARS = overlapTokens * 4;
  
  const chunks: SplitterChunk[] = [];
  let currentChunkText = "";
  let currentChunkPage: number | undefined = undefined;

  for (const source of sources) {
    if (!source.text) continue;

    // First split by paragraphs
    const paragraphs = source.text.split(/\n\n+/);
    
    for (const p of paragraphs) {
      const trimmedP = p.trim();
      if (!trimmedP) continue;

      if (!currentChunkPage) {
        currentChunkPage = source.pageNumber;
      }

      if (currentChunkText.length + trimmedP.length + 2 <= MAX_CHARS) {
        currentChunkText += (currentChunkText ? "\n\n" : "") + trimmedP;
      } else {
        // Chunk is full, push it
        if (currentChunkText) {
          chunks.push({ text: currentChunkText, pageNumber: currentChunkPage });
        }
        
        // Start next chunk with overlap from previous chunk (naive overlap using string slicing)
        const overlapText = currentChunkText.slice(-OVERLAP_CHARS).trim();
        
        // If the single paragraph is still too big, we should split it by sentences
        if (trimmedP.length > MAX_CHARS) {
          const sentences = trimmedP.match(/[^.!?]+[.!?]+/g) || [trimmedP];
          for (const s of sentences) {
            if (currentChunkText.length + s.length + 1 <= MAX_CHARS) {
              currentChunkText += (currentChunkText ? " " : "") + s;
            } else {
              if (currentChunkText) {
                chunks.push({ text: currentChunkText, pageNumber: currentChunkPage });
              }
              currentChunkText = s;
              currentChunkPage = source.pageNumber;
            }
          }
        } else {
          currentChunkText = overlapText + (overlapText ? "\n\n" : "") + trimmedP;
          currentChunkPage = source.pageNumber; // assign page of new paragraph
        }
      }
    }
  }

  // Push remaining chunk
  if (currentChunkText) {
    chunks.push({ text: currentChunkText, pageNumber: currentChunkPage });
  }

  return chunks;
}
