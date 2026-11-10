import {
  albumRows,
  artistRows,
  formatAddedDate,
  genreRows,
  likedSongsRow,
  playlistRows,
} from '@/features/library/library-rows';

const now = new Date(2026, 10, 10, 15, 0);

describe('formatAddedDate', () => {
  it('names today and yesterday by calendar day, not by 24 hours', () => {
    expect(formatAddedDate(new Date(2026, 10, 10, 0, 5).toISOString(), now)).toBe('Today');
    expect(formatAddedDate(new Date(2026, 10, 9, 23, 55).toISOString(), now)).toBe('Yesterday');
  });

  it('counts days within a month, then switches to a date', () => {
    expect(formatAddedDate(new Date(2026, 10, 8, 12).toISOString(), now)).toBe('2 days ago');
    expect(formatAddedDate(new Date(2025, 0, 5, 12).toISOString(), now)).toBe('5 Jan 2025');
  });

  it('returns undefined for missing, invalid and future timestamps', () => {
    expect(formatAddedDate(undefined, now)).toBeUndefined();
    expect(formatAddedDate('nope', now)).toBeUndefined();
    expect(formatAddedDate(new Date(2026, 10, 12).toISOString(), now)).toBeUndefined();
  });
});

describe('library rows', () => {
  it('builds the pinned Liked Songs row', () => {
    expect(likedSongsRow(348)).toMatchObject({
      liked: true,
      typeLabel: 'Collection',
      songCount: 348,
      href: '/home/liked-songs',
    });
    expect(likedSongsRow(undefined).songCount).toBeUndefined();
  });

  it('maps playlists with their created date', () => {
    const rows = playlistRows(
      [{ id: 'p1', name: 'Run', isPublic: false, songCount: 3, duration: 1, created: new Date(2026, 10, 10, 9).toISOString() }],
      now,
    );
    expect(rows[0]).toMatchObject({ title: 'Run', typeLabel: 'Playlist', added: 'Today', href: '/home/playlist/p1' });
  });

  it('maps albums with the artist as subtitle', () => {
    const rows = albumRows([
      { id: 'a1', name: 'Album', artist: 'Band', songCount: 9, duration: 1, starred: true },
    ]);
    expect(rows[0]).toMatchObject({ subtitle: 'Band', songCount: 9, href: '/library/album/a1' });
  });

  it('opens artists in the Library stack and pluralises albums', () => {
    const artists = [
      { id: 'r1', name: 'One', albumCount: 1, starred: false },
      { id: 'r2', name: 'Two', albumCount: 2, starred: false },
    ];
    expect(artistRows(artists).map((r) => r.subtitle)).toEqual(['1 album', '2 albums']);
    expect(artistRows(artists)[0].href).toBe('/library/artist/r1');
  });

  it('url-encodes genre names in the link', () => {
    expect(genreRows([{ name: 'Drum & Bass', songCount: 4, albumCount: 1 }])[0].href).toBe(
      '/library/genre/Drum%20%26%20Bass',
    );
  });
});
