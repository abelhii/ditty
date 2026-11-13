import type { Track } from '@/api/types';

/** How many Tracks `getRandomSongs` is asked for. */
export const UNHEARD_SAMPLE_SIZE = 50;

/** How many rows the Home list shows. */
export const UNHEARD_ROW_LIMIT = 4;

export type UnheardList = {
  /** `unheard`: Tracks never played. `leastPlayed`: every sampled Track has plays. */
  kind: 'unheard' | 'leastPlayed';
  tracks: Track[];
};

/**
 * Picks the Home "Tunes you haven't heard" list from a random sample of Tracks. Subsonic has no
 * "never played" query, so this is a heuristic over the sample, not the whole Library. Tracks with
 * a missing or zero `playCount` count as unheard and keep sample order (already random). When none
 * qualify, falls back to the lowest play counts (`leastPlayed`), ties in sample order. A Track
 * appearing twice is kept once.
 */
export function rankUnheard(tracks: Track[], limit = UNHEARD_ROW_LIMIT): UnheardList {
  const seen = new Set<string>();
  const unique = tracks.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });

  const unheard = unique.filter((track) => !track.playCount || track.playCount <= 0);
  if (unheard.length > 0 || unique.length === 0) return { kind: 'unheard', tracks: unheard.slice(0, limit) };

  const leastPlayed = [...unique]
    .sort((a, b) => (a.playCount ?? 0) - (b.playCount ?? 0))
    .slice(0, limit);
  return { kind: 'leastPlayed', tracks: leastPlayed };
}
