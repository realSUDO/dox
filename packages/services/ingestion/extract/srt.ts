export interface SubtitleCue {
  startSeconds: number;
  endSeconds: number;
  timestampLabel: string;
  text: string;
}

function parseTime(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.replace(",", ".").split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0] as string) * 3600 + parseFloat(parts[1] as string) * 60 + parseFloat(parts[2] as string);
  }
  return 0;
}

export function extractSrt(srtContent: string): SubtitleCue[] {
  const blocks = srtContent.replace(/\r\n/g, "\n").split("\n\n");
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length >= 3) {
      const timeLine = lines[1];
      if (!timeLine) continue;
      
      const match = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (match && match[1] && match[2]) {
        const startSeconds = parseTime(match[1]);
        const endSeconds = parseTime(match[2]);
        const timestampLabel = (match[1].split(",")[0] as string) || "00:00:00"; // HH:MM:SS
        const text = lines.slice(2).join(" ").trim();
        
        if (text) {
          cues.push({ startSeconds, endSeconds, timestampLabel, text });
        }
      }
    }
  }

  return cues;
}
