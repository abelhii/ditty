import type { Artist, Track } from '@/api/types';
import type { LibraryRow } from '@/features/library/library-rows';

export type SortDirection = 'asc' | 'desc';

export type SortOption<K extends string> = { value: K; label: string };

/** 'default' keeps the order the list arrived in. */
export type TrackSortKey = 'default' | 'title' | 'artist' | 'album' | 'duration';
export type ArtistSortKey = 'default' | 'name' | 'albums';
export type RowSortKey = 'default' | 'title' | 'songs' | 'added';

export const TRACK_SORTS: SortOption<TrackSortKey>[] = [
  { value: 'default', label: 'Default' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' },
  { value: 'duration', label: 'Duration' },
];

export const ARTIST_SORTS: SortOption<ArtistSortKey>[] = [
  { value: 'default', label: 'Default' },
  { value: 'name', label: 'Name' },
  { value: 'albums', label: 'Albums' },
];

export const ROW_SORTS: SortOption<RowSortKey>[] = [
  { value: 'default', label: 'Default' },
  { value: 'title', label: 'Title' },
  { value: 'songs', label: 'Songs' },
  { value: 'added', label: 'Date added' },
];

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** True when every whitespace-delimited token of `query` appears (case-insensitively) in one of
 *  `fields`. An empty query matches everything. */
export function matchesTokens(fields: (string | undefined)[], query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fields.join('\n').toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

type Key = string | number | undefined;

/** Stable sort by a derived key. Rows with no key sort last in either direction. */
function sortByKey<T>(items: T[], key: (item: T) => Key, direction: SortDirection): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return items
    .map((item, index) => ({ item, index, k: key(item) }))
    .sort((a, b) => {
      if (a.k === undefined && b.k === undefined) return a.index - b.index;
      if (a.k === undefined) return 1;
      if (b.k === undefined) return -1;
      const order =
        typeof a.k === 'number' && typeof b.k === 'number'
          ? a.k - b.k
          : collator.compare(String(a.k), String(b.k));
      return order === 0 ? a.index - b.index : sign * order;
    })
    .map(({ item }) => item);
}

export function sortTracks(tracks: Track[], key: TrackSortKey, direction: SortDirection): Track[] {
  switch (key) {
    case 'default':
      return tracks;
    case 'title':
      return sortByKey(tracks, (t) => t.title, direction);
    case 'artist':
      return sortByKey(tracks, (t) => t.artist, direction);
    case 'album':
      return sortByKey(tracks, (t) => t.album, direction);
    case 'duration':
      return sortByKey(tracks, (t) => t.duration, direction);
  }
}

export function sortArtists(artists: Artist[], key: ArtistSortKey, direction: SortDirection): Artist[] {
  switch (key) {
    case 'default':
      return artists;
    case 'name':
      return sortByKey(artists, (a) => a.name, direction);
    case 'albums':
      return sortByKey(artists, (a) => a.albumCount, direction);
  }
}

export function sortRows(rows: LibraryRow[], key: RowSortKey, direction: SortDirection): LibraryRow[] {
  switch (key) {
    case 'default':
      return rows;
    case 'title':
      return sortByKey(rows, (r) => r.title, direction);
    case 'songs':
      return sortByKey(rows, (r) => r.songCount, direction);
    case 'added':
      return sortByKey(
        rows,
        (r) => (r.createdAt ? Date.parse(r.createdAt) || undefined : undefined),
        direction,
      );
  }
}

export function filterArtists(artists: Artist[], query: string): Artist[] {
  return artists.filter((artist) => matchesTokens([artist.name], query));
}

export function filterRows(rows: LibraryRow[], query: string): LibraryRow[] {
  return rows.filter((row) => matchesTokens([row.title, row.subtitle], query));
}
