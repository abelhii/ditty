import type { Lyrics } from '@/api/types';

/**
 * The index of the synced line to highlight at `positionSeconds`: the line with the latest start
 * time that has already passed, after the server's `offsetMs` (positive means lines appear sooner,
 * so it is subtracted from each start). Returns -1 before the first line, for unsynced lyrics, and
 * for empty ones. Doesn't assume the lines are sorted; ties go to the later line.
 */
export function currentLineIndex(lyrics: Lyrics, positionSeconds: number): number {
  if (!lyrics.synced) return -1;
  const positionMs = positionSeconds * 1000;
  let best = -1;
  let bestStart = -Infinity;
  lyrics.lines.forEach((line, index) => {
    if (line.startMs === undefined) return;
    const start = line.startMs - lyrics.offsetMs;
    if (start <= positionMs && start >= bestStart) {
      best = index;
      bestStart = start;
    }
  });
  return best;
}
