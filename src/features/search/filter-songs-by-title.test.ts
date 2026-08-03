import type { Track } from '@/api/types';
import { filterSongsByTitle, titleMatchesQuery } from '@/features/search/filter-songs-by-title';

function song(id: string, title: string, artist: string): Track {
  return { id, title, artist, album: 'Album', duration: 180, starred: false };
}

describe('titleMatchesQuery', () => {
  it('matches a case-insensitive substring of the title', () => {
    expect(titleMatchesQuery('Paranoid Android', 'para')).toBe(true);
    expect(titleMatchesQuery('Paranoid Android', 'ANDROID')).toBe(true);
  });

  it('matches regardless of token order or extra spacing', () => {
    expect(titleMatchesQuery('Paranoid Android', 'android  paranoid')).toBe(true);
  });

  it('does not match when a token is absent from the title', () => {
    expect(titleMatchesQuery('Karma Police', 'radiohead')).toBe(false);
  });
});

describe('filterSongsByTitle', () => {
  it('keeps only songs whose title matches, dropping artist-only matches', () => {
    const tracks = [
      song('1', 'Radiohead Tribute', 'Various'),
      song('2', 'Karma Police', 'Radiohead'),
      song('3', 'No Surprises', 'Radiohead'),
    ];
    // Searching the artist name keeps the song that actually has it in the title, not the whole
    // Radiohead catalogue the server matched by artist.
    expect(filterSongsByTitle(tracks, 'radiohead').map((t) => t.id)).toEqual(['1']);
  });

  it('returns every track for a blank query', () => {
    const tracks = [song('1', 'A', 'x'), song('2', 'B', 'y')];
    expect(filterSongsByTitle(tracks, '   ')).toHaveLength(2);
  });
});
