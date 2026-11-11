import type { Artist, Track } from '@/api/types';
import type { LibraryRow } from '@/features/library/library-rows';
import {
  filterArtists,
  filterRows,
  matchesTokens,
  sortArtists,
  sortRows,
  sortTracks,
} from '@/features/library/list-sort';

const track = (id: string, title: string, artist = 'A', album = 'X', duration = 100): Track => ({
  id,
  title,
  artist,
  album,
  duration,
  starred: false,
});
const artist = (id: string, name: string, albumCount: number): Artist => ({
  id,
  name,
  albumCount,
  starred: false,
});
const row = (key: string, title: string, extra: Partial<LibraryRow> = {}): LibraryRow => ({
  key,
  title,
  typeLabel: 'Playlist',
  href: '/x',
  ...extra,
});
const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe('matchesTokens', () => {
  it('matches every token in any field, ignoring case and order', () => {
    expect(matchesTokens(['Blue Monday', 'New Order'], 'order blue')).toBe(true);
    expect(matchesTokens(['Blue Monday', 'New Order'], 'blue red')).toBe(false);
  });
  it('matches everything for an empty or blank query and tolerates missing fields', () => {
    expect(matchesTokens([undefined], '')).toBe(true);
    expect(matchesTokens(['x'], '   ')).toBe(true);
    expect(matchesTokens([undefined], 'a')).toBe(false);
  });
});

describe('sortTracks', () => {
  const tracks = [
    track('1', 'b', 'Z', 'M', 30),
    track('2', 'A', 'Y', 'N', 10),
    track('3', 'c', 'X', 'L', 20),
  ];
  it('keeps the incoming order for default', () => {
    expect(sortTracks(tracks, 'default', 'desc')).toBe(tracks);
  });
  it('sorts text case-insensitively in both directions', () => {
    expect(ids(sortTracks(tracks, 'title', 'asc'))).toEqual(['2', '1', '3']);
    expect(ids(sortTracks(tracks, 'title', 'desc'))).toEqual(['3', '1', '2']);
    expect(ids(sortTracks(tracks, 'artist', 'asc'))).toEqual(['3', '2', '1']);
    expect(ids(sortTracks(tracks, 'album', 'asc'))).toEqual(['3', '1', '2']);
  });
  it('sorts durations numerically', () => {
    expect(ids(sortTracks(tracks, 'duration', 'asc'))).toEqual(['2', '3', '1']);
  });
  it('treats accents as equal and keeps ties stable', () => {
    const tied = [track('1', 'Éa'), track('2', 'ea'), track('3', 'Eb')];
    expect(ids(sortTracks(tied, 'title', 'asc'))).toEqual(['1', '2', '3']);
    expect(ids(sortTracks(tied, 'title', 'desc'))).toEqual(['3', '1', '2']);
  });
  it('handles an empty list', () => {
    expect(sortTracks([], 'title', 'asc')).toEqual([]);
  });
});

describe('sortArtists', () => {
  const artists = [artist('1', 'Beck', 3), artist('2', 'ABBA', 9)];
  it('sorts by name or album count', () => {
    expect(ids(sortArtists(artists, 'name', 'asc'))).toEqual(['2', '1']);
    expect(ids(sortArtists(artists, 'albums', 'desc'))).toEqual(['2', '1']);
  });
});

describe('sortRows', () => {
  const rows = [
    row('1', 'b', { songCount: 5, createdAt: '2026-01-01T00:00:00Z' }),
    row('2', 'a'),
    row('3', 'c', { songCount: 9, createdAt: '2026-06-01T00:00:00Z' }),
  ];
  it('puts rows with no value last whichever way it sorts', () => {
    expect(sortRows(rows, 'songs', 'asc').map((r) => r.key)).toEqual(['1', '3', '2']);
    expect(sortRows(rows, 'songs', 'desc').map((r) => r.key)).toEqual(['3', '1', '2']);
    expect(sortRows(rows, 'added', 'desc').map((r) => r.key)).toEqual(['3', '1', '2']);
  });
  it('ignores an unparseable date', () => {
    const bad = [row('1', 'a', { createdAt: 'nope' }), row('2', 'b', { createdAt: '2026-01-01T00:00:00Z' })];
    expect(sortRows(bad, 'added', 'asc').map((r) => r.key)).toEqual(['2', '1']);
  });
});

describe('filters', () => {
  it('filters artists by name', () => {
    expect(filterArtists([artist('1', 'Beck', 1), artist('2', 'ABBA', 1)], 'bb').map((a) => a.id)).toEqual([
      '2',
    ]);
  });
  it('filters rows by title or subtitle', () => {
    const rows = [row('1', 'Kind of Blue', { subtitle: 'Miles Davis' }), row('2', 'Other')];
    expect(filterRows(rows, 'miles').map((r) => r.key)).toEqual(['1']);
    expect(filterRows(rows, 'zzz')).toEqual([]);
  });
});
