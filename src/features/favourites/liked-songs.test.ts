import type { Track } from '@/api/types';
import { formatTotalDuration, sortLikedTracks, totalDuration } from '@/features/favourites/liked-songs';

const t = (id: string, over: Partial<Track> = {}): Track => ({
  id,
  title: id,
  artist: 'A',
  album: 'Al',
  duration: 100,
  starred: true,
  ...over,
});
const ids = (tracks: Track[]) => tracks.map((x) => x.id);

describe('sortLikedTracks', () => {
  it('returns an empty list for an empty list', () => {
    expect(sortLikedTracks([], 'recent')).toEqual([]);
    expect(sortLikedTracks([], 'title')).toEqual([]);
    expect(sortLikedTracks([], 'artist')).toEqual([]);
  });

  it('recent: newest starredAt first', () => {
    const tracks = [
      t('old', { starredAt: '2026-01-01T00:00:00Z' }),
      t('new', { starredAt: '2026-06-01T00:00:00Z' }),
      t('mid', { starredAt: '2026-03-01T00:00:00Z' }),
    ];
    expect(ids(sortLikedTracks(tracks, 'recent'))).toEqual(['new', 'mid', 'old']);
  });

  it('recent: a missing or unparseable starredAt counts as newest; ties keep input order', () => {
    const tracks = [
      t('dated', { starredAt: '2026-06-01T00:00:00Z' }),
      t('none1'),
      t('bad', { starredAt: 'nope' }),
      t('same', { starredAt: '2026-06-01T00:00:00Z' }),
    ];
    expect(ids(sortLikedTracks(tracks, 'recent'))).toEqual(['none1', 'bad', 'dated', 'same']);
  });

  it('title: A-Z, ignoring case, stable on ties', () => {
    const tracks = [t('1', { title: 'beta' }), t('2', { title: 'Alpha' }), t('3', { title: 'beta' })];
    expect(ids(sortLikedTracks(tracks, 'title'))).toEqual(['2', '1', '3']);
  });

  it('artist: A-Z, stable on ties', () => {
    const tracks = [t('1', { artist: 'Zed' }), t('2', { artist: 'abba' }), t('3', { artist: 'Zed' })];
    expect(ids(sortLikedTracks(tracks, 'artist'))).toEqual(['2', '1', '3']);
  });

  it('does not mutate its input', () => {
    const tracks = [t('b', { title: 'b' }), t('a', { title: 'a' })];
    sortLikedTracks(tracks, 'title');
    expect(ids(tracks)).toEqual(['b', 'a']);
  });
});

describe('totalDuration', () => {
  it('is 0 for an empty list', () => {
    expect(totalDuration([])).toBe(0);
  });

  it('sums durations, treating missing/NaN as 0', () => {
    const tracks = [
      t('1', { duration: 60 }),
      t('2', { duration: NaN }),
      t('3', { duration: undefined as unknown as number }),
    ];
    expect(totalDuration(tracks)).toBe(60);
  });
});

describe('formatTotalDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatTotalDuration(21 * 3600 + 40 * 60 + 30)).toBe('21 hr 40 min');
  });
  it('drops hours under an hour', () => {
    expect(formatTotalDuration(59 * 60)).toBe('59 min');
  });
  it('handles zero', () => {
    expect(formatTotalDuration(0)).toBe('0 min');
  });
});
