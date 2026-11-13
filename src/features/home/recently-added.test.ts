import type { Album, Playlist } from '@/api/types';
import {
  addedCaption,
  groupByRecency,
  itemCaption,
  recentItems,
  type RecentItem,
  toListEntries,
} from '@/features/home/recently-added';

const NOW = Date.parse('2026-11-13T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

const album = (id: string, created?: string): Album => ({
  id,
  name: `Album ${id}`,
  artist: 'A',
  songCount: 1,
  duration: 1,
  starred: false,
  created,
});
const playlist = (id: string, created?: string): Playlist => ({
  id,
  name: `Playlist ${id}`,
  isPublic: false,
  songCount: 1,
  duration: 1,
  created,
});
const item = (id: string, created?: string): RecentItem => ({ kind: 'album', id, title: id, created });
const ids = (items: RecentItem[]) => items.map((i) => i.id);

describe('addedCaption', () => {
  it('words today, yesterday, days, weeks, months and years', () => {
    expect(addedCaption(daysAgo(0), NOW)).toBe('Added today');
    expect(addedCaption(daysAgo(1), NOW)).toBe('Added yesterday');
    expect(addedCaption(daysAgo(2), NOW)).toBe('Added 2 days ago');
    expect(addedCaption(daysAgo(6), NOW)).toBe('Added 6 days ago');
    expect(addedCaption(daysAgo(7), NOW)).toBe('Added 1 week ago');
    expect(addedCaption(daysAgo(21), NOW)).toBe('Added 3 weeks ago');
    expect(addedCaption(daysAgo(30), NOW)).toBe('Added 1 month ago');
    expect(addedCaption(daysAgo(120), NOW)).toBe('Added 4 months ago');
    expect(addedCaption(daysAgo(365), NOW)).toBe('Added 1 year ago');
    expect(addedCaption(daysAgo(800), NOW)).toBe('Added 2 years ago');
  });

  it('is empty for a missing or unparseable date, and treats the future as today', () => {
    expect(addedCaption(undefined, NOW)).toBe('');
    expect(addedCaption('not a date', NOW)).toBe('');
    expect(addedCaption(daysAgo(-3), NOW)).toBe('Added today');
  });
});

describe('itemCaption', () => {
  it('prefixes the type, dropping the date part when unknown', () => {
    expect(itemCaption({ ...item('a', daysAgo(2)), kind: 'album' }, NOW)).toBe('Album · Added 2 days ago');
    expect(itemCaption({ ...item('p', daysAgo(2)), kind: 'playlist' }, NOW)).toBe('Playlist · Added 2 days ago');
    expect(itemCaption(item('a'), NOW)).toBe('Album');
  });
});

describe('recentItems', () => {
  const albums = [album('a1', daysAgo(1)), album('a2', daysAgo(10))];
  const playlists = [playlist('p1', daysAgo(5)), playlist('p2', daysAgo(40))];

  it('returns nothing for empty input', () => {
    expect(recentItems([], [], 'all', false)).toEqual([]);
    expect(recentItems([], [], 'playlists', true)).toEqual([]);
  });

  it('merges albums and playlists newest first on All', () => {
    expect(ids(recentItems(albums, playlists, 'all', false))).toEqual(['a1', 'p1', 'a2', 'p2']);
  });

  it('filters by type', () => {
    expect(ids(recentItems(albums, playlists, 'albums', false))).toEqual(['a1', 'a2']);
    expect(ids(recentItems(albums, playlists, 'playlists', false))).toEqual(['p1', 'p2']);
  });

  it('puts undated items last, keeping their order', () => {
    const result = recentItems([album('u1'), album('a1', daysAgo(1)), album('u2')], [], 'albums', false);
    expect(ids(result)).toEqual(['a1', 'u1', 'u2']);
  });

  it('holds back playlists older than the oldest loaded album while more albums remain', () => {
    expect(ids(recentItems(albums, playlists, 'all', true))).toEqual(['a1', 'p1', 'a2']);
    // The Playlists chip is unaffected.
    expect(ids(recentItems(albums, playlists, 'playlists', true))).toEqual(['p1', 'p2']);
  });

  it('keeps every playlist when no loaded album has a date to compare against', () => {
    expect(ids(recentItems([album('u1')], playlists, 'all', true))).toEqual(['p1', 'p2', 'u1']);
  });
});

describe('groupByRecency', () => {
  it('returns no groups for empty input', () => {
    expect(groupByRecency([], NOW)).toEqual([]);
  });

  it('splits at the 7 and 30 day boundaries and drops empty groups', () => {
    const groups = groupByRecency(
      [
        item('d0', daysAgo(0)),
        item('d6', daysAgo(6.9)),
        item('d7', daysAgo(7)),
        item('d29', daysAgo(29.9)),
        item('d30', daysAgo(30)),
      ],
      NOW,
    );
    expect(groups.map((g) => [g.title, ids(g.items)])).toEqual([
      ['This week', ['d0', 'd6']],
      ['This month', ['d7', 'd29']],
      ['Earlier', ['d30']],
    ]);
    expect(groupByRecency([item('old', daysAgo(90))], NOW).map((g) => g.title)).toEqual(['Earlier']);
  });

  it('files undated items under Earlier and future dates under This week', () => {
    const groups = groupByRecency([item('future', daysAgo(-2)), item('none')], NOW);
    expect(groups.map((g) => [g.title, ids(g.items)])).toEqual([
      ['This week', ['future']],
      ['Earlier', ['none']],
    ]);
  });
});

describe('toListEntries', () => {
  it('emits a heading then rows of `columns` items, with a short last row', () => {
    const groups = groupByRecency(
      [item('a', daysAgo(1)), item('b', daysAgo(2)), item('c', daysAgo(3)), item('d', daysAgo(90))],
      NOW,
    );
    const entries = toListEntries(groups, 2);
    expect(entries.map((e) => (e.type === 'heading' ? e.title : ids(e.items)))).toEqual([
      'This week',
      ['a', 'b'],
      ['c'],
      'Earlier',
      ['d'],
    ]);
    expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
  });

  it('returns nothing for no groups', () => {
    expect(toListEntries([], 2)).toEqual([]);
  });
});
