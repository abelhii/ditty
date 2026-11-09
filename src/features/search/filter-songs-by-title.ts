import type { Track } from '@/api/types';

/** True when every whitespace-delimited token of `query` appears (case-insensitively) in `title`.
 *  Token-based rather than a single substring so word order and extra spacing don't matter. */
export function titleMatchesQuery(title: string, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = title.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Restricts `search3`'s song results to those whose *title* matches the query. `search3` matches a
 * query against song title, artist, and album with no way to scope it server-side — so searching an
 * artist's name otherwise returns that artist's whole catalogue under Songs. Filtering client-side
 * keeps the Songs section about songs the user named, not every track by a matched artist.
 */
export function filterSongsByTitle(tracks: Track[], query: string): Track[] {
  return tracks.filter((track) => titleMatchesQuery(track.title, query));
}
