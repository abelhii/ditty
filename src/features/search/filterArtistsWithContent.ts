import type { Artist } from '@/api/types';

/**
 * Drops artists that have no albums (and therefore no songs) from search results. `search3`
 * sometimes returns "empty" artist entries — name-only matches with nothing to browse into — which
 * are dead ends when tapped. In Navidrome every song belongs to an album, so `albumCount === 0`
 * means the artist has no content at all.
 */
export function filterArtistsWithContent(artists: Artist[]): Artist[] {
  return artists.filter((artist) => artist.albumCount > 0);
}
