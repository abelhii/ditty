import type { Track } from '@/api/types';

export type MostPlayedLimits = {
  /** How many of the frequently played albums are searched for Tracks. */
  albums: number;
  /** How many ranked Tracks are kept. */
  tracks: number;
};

/** The short list on Home. */
export const MOST_PLAYED_HOME: MostPlayedLimits = { albums: 10, tracks: 5 };

/** The dedicated Most played screen. The album count is the whole Frequently played shelf. */
export const MOST_PLAYED_FULL: MostPlayedLimits = { albums: 20, tracks: 50 };

/**
 * Ranks Tracks by play count, highest first. Tracks with a missing or zero count are dropped, and
 * the same Track appearing twice is kept once. Ties keep their input order.
 */
export function rankMostPlayed(tracks: Track[], limit = MOST_PLAYED_FULL.tracks): Track[] {
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
