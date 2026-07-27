import { YoutubeTranscript } from 'youtube-transcript';
import { logger } from '@repo/logger';

export interface YoutubeCue {
  text: string;
  startSeconds: number;
  endSeconds: number;
  timestampLabel: string;
}

export async function extractYoutubeTranscript(url: string): Promise<YoutubeCue[]> {
  try {
    const proxyUrl = process.env.YOUTUBE_PROXY_URL;
    const proxyKey = process.env.YOUTUBE_PROXY_API_KEY || 'dox_proxy_secret_key_123';
    
    let transcriptData: any[];

    if (proxyUrl) {
      logger.info(`[YouTube Extractor] Using proxy ${proxyUrl} for ${url}`);
      const res = await fetch(`${proxyUrl}/transcript?url=${encodeURIComponent(url)}`, {
        headers: {
          'Authorization': `Bearer ${proxyKey}`
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Proxy error ${res.status}: ${errorText}`);
      }
      
      transcriptData = await res.json();
    } else {
      logger.info(`[YouTube Extractor] No proxy configured, fetching directly for ${url}`);
      transcriptData = await YoutubeTranscript.fetchTranscript(url);
    }

    if (!transcriptData || transcriptData.length === 0) {
      throw new Error("No transcript available for this video.");
    }
    
    return transcriptData.map(t => {
      const startSeconds = t.offset / 1000;
      const endSeconds = (t.offset + t.duration) / 1000;
      
      // format as MM:SS
      const mins = Math.floor(startSeconds / 60);
      const secs = Math.floor(startSeconds % 60);
      const timestampLabel = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      return {
        text: t.text,
        startSeconds,
        endSeconds,
        timestampLabel
      };
    });
  } catch (error) {
    logger.error(`[YouTube Extractor] Failed to extract transcript for ${url}`, { error });
    throw new Error(`Could not extract YouTube transcript: ${error instanceof Error ? error.message : String(error)}`);
  }
}
