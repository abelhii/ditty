import type { Playlist } from '@/api/types';
import { titleMatchesQuery } from '@/features/search/filter-songs-by-title';

export type SearchFilter = 'all' | 'songs' | 'artists' | 'albums' | 'playlists';

export type SearchCounts = {
  songs: number;
  artists: number;
  albums: number;
  playlists: number;
};

/** Playlists whose name matches `term` (same token rules as song titles). `search3` doesn't return
 *  Playlists, so they're matched client-side over the cached `getPlaylists` list. */
export function filterPlaylistsByName(playlists: Playlist[], term: string): Playlist[] {
  return playlists.filter((playlist) => titleMatchesQuery(playlist.name, term));
}

/** Number of results visible under the active chip; All sums every type. */
export function resultCount(filter: SearchFilter, counts: SearchCounts): number {
  if (filter === 'all') return counts.songs + counts.artists + counts.albums + counts.playlists;
  return counts[filter];
}

/** "1 result" / "24 results". */
export function formatResultCount(count: number): string {
  return `${count} ${count === 1 ? 'result' : 'results'}`;
}

/** "1 song" / "12 songs". */
export function songCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'song' : 'songs'}`;
}
