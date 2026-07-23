import { SubtitleCue } from "./srt";

function parseVttTime(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0] as string) * 3600 + parseFloat(parts[1] as string) * 60 + parseFloat(parts[2] as string);
  } else if (parts.length === 2) {
    return parseFloat(parts[0] as string) * 60 + parseFloat(parts[1] as string);
  }
  return 0;
}

export function extractVtt(vttContent: string): SubtitleCue[] {
  const blocks = vttContent.replace(/\r\n/g, "\n").split("\n\n");
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    if (block.startsWith("WEBVTT") || block.startsWith("NOTE") || block.startsWith("STYLE")) {
      continue;
    }

    const lines = block.trim().split("\n");
    const timeLineIndex = lines.findIndex(l => l.includes("-->"));
    
    if (timeLineIndex !== -1) {
      const timeLine = lines[timeLineIndex];
      if (!timeLine) continue;

      const match = timeLine.match(/([\d:.]+)\s*-->\s*([\d:.]+)/);
      
      if (match && match[1] && match[2]) {
        const startSeconds = parseVttTime(match[1]);
        const endSeconds = parseVttTime(match[2]);
        
        let timestampLabel = (match[1].split(".")[0] as string) || "00:00:00";
        if (timestampLabel.split(":").length === 2) {
          timestampLabel = "00:" + timestampLabel;
        }

        const textLines = lines.slice(timeLineIndex + 1);
        const text = textLines.join(" ").replace(/<[^>]+>/g, "").trim();
        
        if (text) {
          cues.push({ startSeconds, endSeconds, timestampLabel, text });
        }
      }
    }
  }

  return cues;
}
