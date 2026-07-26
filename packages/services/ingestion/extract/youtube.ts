import { YoutubeTranscript } from 'youtube-transcript';
import { logger } from '@repo/logger';

export async function extractYoutubeTranscript(url: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript available for this video.");
    }
    
    // Combine all transcript pieces into a single text block
    const fullText = transcript.map(t => t.text).join(' ');
    return fullText;
  } catch (error) {
    logger.error(`[YouTube Extractor] Failed to extract transcript for ${url}`, { error });
    throw new Error(`Could not extract YouTube transcript: ${error instanceof Error ? error.message : String(error)}`);
  }
}
