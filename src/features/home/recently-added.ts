import type { Album, Playlist } from '@/api/types';

/** Albums fetched per page of the Recently added screen. */
export const RECENTLY_ADDED_PAGE_SIZE = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
const YEAR_DAYS = 365;

export type RecentFilter = 'all' | 'albums' | 'playlists';
export type RecentKind = 'album' | 'playlist';

export type RecentItem = {
  kind: RecentKind;
  id: string;
  title: string;
  coverArtId?: string;
  /** ISO timestamp the server added the item; absent when the server doesn't report one. */
  created?: string;
};

export type RecentGroup = { title: string; items: RecentItem[] };

/** One entry of the flat, row-per-entry list the screen renders (a FlatList can't put headings
 *  between the rows of a multi-column grid). */
export type RecentListEntry =
  | { type: 'heading'; key: string; title: string }
  | { type: 'row'; key: string; items: RecentItem[] };

function timeOf(item: RecentItem): number | undefined {
  if (item.created === undefined) return undefined;
  const time = Date.parse(item.created);
  return Number.isNaN(time) ? undefined : time;
}

/** Whole days between `time` and `now`; 0 for a timestamp in the future (clock skew). */
function ageInDays(time: number, now: number): number {
  return Math.max(0, Math.floor((now - time) / DAY_MS));
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

/** "Added today" / "Added 2 days ago" / "Added 3 weeks ago" …; empty when there's no usable date. */
export function addedCaption(created: string | undefined, now: number): string {
  const time = created === undefined ? NaN : Date.parse(created);
  if (Number.isNaN(time)) return '';
  const days = ageInDays(time, now);
  if (days === 0) return 'Added today';
  if (days === 1) return 'Added yesterday';
  if (days < WEEK_DAYS) return `Added ${plural(days, 'day')}`;
  if (days < MONTH_DAYS) return `Added ${plural(Math.floor(days / WEEK_DAYS), 'week')}`;
  if (days < YEAR_DAYS) return `Added ${plural(Math.floor(days / MONTH_DAYS), 'month')}`;
  return `Added ${plural(Math.floor(days / YEAR_DAYS), 'year')}`;
}

/** "Album · Added 2 days ago", or just "Album" when the date is unknown. */
export function itemCaption(item: RecentItem, now: number): string {
  const kind = item.kind === 'album' ? 'Album' : 'Playlist';
  const added = addedCaption(item.created, now);
  return added === '' ? kind : `${kind} · ${added}`;
}

function sortNewestFirst(items: RecentItem[]): RecentItem[] {
  return items
    .map((item, index) => ({ item, index, time: timeOf(item) }))
    .sort((a, b) => {
      if (a.time === undefined && b.time === undefined) return a.index - b.index;
      if (a.time === undefined) return 1;
      if (b.time === undefined) return -1;
      return b.time - a.time || a.index - b.index;
    })
    .map(({ item }) => item);
}

/**
 * The items for a chip, newest first; items without a usable date go last, in their given order.
 * `hasMoreAlbums` means older albums are still unfetched, so on All a Playlist older than the oldest
 * loaded album is held back — otherwise it would sit above albums that later pages slot in before it.
 */
export function recentItems(
  albums: Album[],
  playlists: Playlist[],
  filter: RecentFilter,
  hasMoreAlbums: boolean,
): RecentItem[] {
  const albumItems: RecentItem[] = albums.map((album) => ({
    kind: 'album',
    id: album.id,
    title: album.name,
    coverArtId: album.coverArtId,
    created: album.created,
  }));
  let playlistItems: RecentItem[] = playlists.map((playlist) => ({
    kind: 'playlist',
    id: playlist.id,
    title: playlist.name,
    coverArtId: playlist.coverArtId,
    created: playlist.created,
  }));

  if (filter === 'playlists') return sortNewestFirst(playlistItems);
  if (filter === 'albums') return sortNewestFirst(albumItems);

  if (hasMoreAlbums) {
    const loadedTimes = albumItems.map(timeOf).filter((time): time is number => time !== undefined);
    if (loadedTimes.length > 0) {
      const oldestLoaded = Math.min(...loadedTimes);
      playlistItems = playlistItems.filter((item) => (timeOf(item) ?? -Infinity) >= oldestLoaded);
    }
  }

  return sortNewestFirst([...albumItems, ...playlistItems]);
}

/** Buckets newest-first items under This week (under 7 days), This month (under 30) and Earlier
 *  (older, or undated). Empty groups are dropped. */
export function groupByRecency(items: RecentItem[], now: number): RecentGroup[] {
  const groups: RecentGroup[] = [
    { title: 'This week', items: [] },
    { title: 'This month', items: [] },
    { title: 'Earlier', items: [] },
  ];
  for (const item of items) {
    const time = timeOf(item);
    const days = time === undefined ? Infinity : ageInDays(time, now);
    const bucket = days < WEEK_DAYS ? 0 : days < MONTH_DAYS ? 1 : 2;
    groups[bucket].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

/** Flattens groups into heading and grid-row entries, `columns` items per row. */
export function toListEntries(groups: RecentGroup[], columns: number): RecentListEntry[] {
  const entries: RecentListEntry[] = [];
  for (const group of groups) {
    entries.push({ type: 'heading', key: `heading-${group.title}`, title: group.title });
    for (let start = 0; start < group.items.length; start += columns) {
      const items = group.items.slice(start, start + columns);
      entries.push({ type: 'row', key: `row-${items[0].kind}-${items[0].id}`, items });
    }
  }
  return entries;
}
