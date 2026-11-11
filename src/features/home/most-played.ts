import type { Track } from '@/api/types';

/** How many Tracks the Most played section shows. */
export const MOST_PLAYED_TRACK_COUNT = 10;

/** How many of the frequently played albums are searched for Tracks. */
export const MOST_PLAYED_ALBUM_COUNT = 10;

/**
 * Ranks Tracks by play count, highest first. Tracks with a missing or zero count are dropped, and
 * the same Track appearing twice is kept once. Ties keep their input order.
 */
export function rankMostPlayed(tracks: Track[], limit = MOST_PLAYED_TRACK_COUNT): Track[] {
  const seen = new Set<string>();
  return tracks
    .filter((track) => {
      if (!track.playCount || track.playCount <= 0 || seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    })
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .slice(0, limit);
}
