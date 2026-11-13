import type { Track } from '@/api/types';
import { sortTracks } from '@/features/library/list-sort';

export type LikedSortKey = 'recent' | 'title' | 'artist';

export const LIKED_SORTS: { value: LikedSortKey; label: string }[] = [
  { value: 'recent', label: 'Recently liked' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'artist', label: 'Artist' },
];

/** Orders Liked Tracks. 'recent' is newest-liked first; a Track with no usable `starredAt` (e.g.
 *  one just liked optimistically, before the server's timestamp is known) counts as newest so it
 *  stays at the top. All sorts are stable. */
export function sortLikedTracks(tracks: Track[], key: LikedSortKey): Track[] {
  switch (key) {
    case 'title':
      return sortTracks(tracks, 'title', 'asc');
    case 'artist':
      return sortTracks(tracks, 'artist', 'asc');
    case 'recent':
      return tracks
        .map((track, index) => ({ track, index, at: Date.parse(track.starredAt ?? '') }))
        .sort((a, b) => {
          const aAt = Number.isNaN(a.at) ? Infinity : a.at;
          const bAt = Number.isNaN(b.at) ? Infinity : b.at;
          if (aAt === bAt) return a.index - b.index;
          return aAt > bAt ? -1 : 1;
        })
        .map(({ track }) => track);
  }
}

/** Sum of Track durations in seconds; a missing/invalid duration counts as 0. */
export function totalDuration(tracks: Track[]): number {
  return tracks.reduce((sum, track) => sum + (Number.isFinite(track.duration) ? track.duration : 0), 0);
}

/** "21 hr 40 min", or "40 min" under an hour. */
export function formatTotalDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}
