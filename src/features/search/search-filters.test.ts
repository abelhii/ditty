import type { Playlist } from '@/api/types';
import {
  filterPlaylistsByName,
  formatResultCount,
  resultCount,
  songCountLabel,
} from '@/features/search/search-filters';

function playlist(id: string, name: string): Playlist {
  return { id, name, isPublic: false, songCount: 3, duration: 600 };
}

describe('filterPlaylistsByName', () => {
  const playlists = [playlist('1', 'Road Trip'), playlist('2', 'Chill Vibes'), playlist('3', 'Trip Hop')];

  it('matches names case-insensitively, in any token order', () => {
    expect(filterPlaylistsByName(playlists, 'trip').map((p) => p.id)).toEqual(['1', '3']);
    expect(filterPlaylistsByName(playlists, 'TRIP ROAD').map((p) => p.id)).toEqual(['1']);
  });

  it('returns nothing when no name matches, and handles an empty list', () => {
    expect(filterPlaylistsByName(playlists, 'jazz')).toEqual([]);
    expect(filterPlaylistsByName([], 'trip')).toEqual([]);
  });
});

describe('resultCount', () => {
  const counts = { songs: 10, artists: 3, albums: 5, playlists: 2 };

  it('sums every type for All', () => {
    expect(resultCount('all', counts)).toBe(20);
  });

  it('returns only the active type otherwise', () => {
    expect(resultCount('songs', counts)).toBe(10);
    expect(resultCount('artists', counts)).toBe(3);
    expect(resultCount('albums', counts)).toBe(5);
    expect(resultCount('playlists', counts)).toBe(2);
  });

  it('is zero when nothing matched', () => {
    expect(resultCount('all', { songs: 0, artists: 0, albums: 0, playlists: 0 })).toBe(0);
  });
});

describe('labels', () => {
  it('pluralises result counts', () => {
    expect(formatResultCount(1)).toBe('1 result');
    expect(formatResultCount(0)).toBe('0 results');
    expect(formatResultCount(24)).toBe('24 results');
  });

  it('pluralises song counts', () => {
    expect(songCountLabel(1)).toBe('1 song');
    expect(songCountLabel(12)).toBe('12 songs');
  });
});
