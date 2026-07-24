import { SubtitleCue } from "../extract/srt";

export interface SlidingWindowChunk {
  startSeconds: number;
  endSeconds: number;
  timestampLabel: string;
  text: string;
}

export function chunkSlidingWindow(
  cues: SubtitleCue[],
  maxDurationSeconds = 180,
  overlapCues = 2
): SlidingWindowChunk[] {
  const chunks: SlidingWindowChunk[] = [];
  
  if (cues.length === 0) return chunks;

  let currentGroup: SubtitleCue[] = [];
  let currentGroupDuration = 0;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (!cue) continue;

    currentGroup.push(cue);
    const firstInGroup = currentGroup[0];
    const lastInGroup = currentGroup[currentGroup.length - 1];

    if (firstInGroup && lastInGroup && currentGroup.length > 1) {
      currentGroupDuration = lastInGroup.endSeconds - firstInGroup.startSeconds;
    } else if (cue) {
      currentGroupDuration = cue.endSeconds - cue.startSeconds;
    }

    if (currentGroupDuration >= maxDurationSeconds || i === cues.length - 1) {
      const text = currentGroup.map(c => c.text).join(" ");
      const first = currentGroup[0];
      const last = currentGroup[currentGroup.length - 1];
      
      if (first && last) {
        chunks.push({
          startSeconds: first.startSeconds,
          endSeconds: last.endSeconds,
          timestampLabel: first.timestampLabel,
          text,
        });
      }

      const overlapStartIdx = Math.max(0, currentGroup.length - overlapCues);
      const overlap = currentGroup.slice(overlapStartIdx);
      currentGroup = [...overlap];
      currentGroupDuration = 0;
    }
  }

  return chunks;
}
