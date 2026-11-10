import type { Artist } from '@/api/types';
import { sampleArtists, wideColumnCount, wideHomeLayout } from '@/features/home/wide-grid';

// theme.ts imports the web stylesheet, which jest can't parse.
jest.mock('@/global.css', () => ({}));

const artist = (id: string): Artist => ({ id, name: id, albumCount: 1, starred: false });

describe('wideHomeLayout', () => {
  it('reflows 3 -> 4 -> 6 columns at 900, 1100 and 1400 wide', () => {
    expect(wideHomeLayout(900).columns).toBe(3);
    expect(wideHomeLayout(1100).columns).toBe(4);
    expect(wideHomeLayout(1400).columns).toBe(6);
  });

  it('keeps the 6-column maximum on a very wide window', () => {
    expect(wideHomeLayout(3000).columns).toBe(6);
  });

  it('never goes below 3 columns', () => {
    expect(wideColumnCount(100)).toBe(3);
  });

  it('fills the content width exactly with tiles and gaps', () => {
    for (const width of [900, 1100, 1400, 2000]) {
      const { contentWidth, columns, tileWidth } = wideHomeLayout(width);
      expect(columns * tileWidth + (columns - 1) * 24).toBeCloseTo(contentWidth);
    }
  });
});

describe('sampleArtists', () => {
  const artists = ['a', 'b', 'c', 'd', 'e'].map(artist);

  it('returns the requested number without repeats', () => {
    const picked = sampleArtists(artists, 3, () => 0.5);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((a) => a.id)).size).toBe(3);
  });

  it('returns everything when there are fewer artists than asked for', () => {
    expect(sampleArtists(artists.slice(0, 2), 6, Math.random)).toHaveLength(2);
  });

  it('handles an empty list and leaves the input unmodified', () => {
    expect(sampleArtists([], 6, Math.random)).toEqual([]);
    sampleArtists(artists, 5, () => 0);
    expect(artists.map((a) => a.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
