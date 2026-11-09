import { CoverArtSize } from '@/api/subsonic/endpoints/media';
import { AlbumGridGap, albumGridLayout } from '@/components/album-grid';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));

const contentWidth = (windowWidth: number) => Math.min(windowWidth, MaxContentWidth) - Spacing.four * 2;

describe('albumGridLayout', () => {
  it('keeps two columns on a phone', () => {
    expect(albumGridLayout(375, 2).columns).toBe(2);
    expect(albumGridLayout(320, 2).columns).toBe(2);
  });

  it('adds columns as the window gets wider', () => {
    expect(albumGridLayout(768, 2).columns).toBe(4);
    expect(albumGridLayout(1390, 1).columns).toBe(4);
  });

  it('fills the content width exactly with tiles and gaps', () => {
    for (const width of [320, 375, 515, 768, 1390]) {
      const { columns, tileWidth } = albumGridLayout(width, 2);
      expect(columns * tileWidth + (columns - 1) * AlbumGridGap).toBeCloseTo(contentWidth(width));
    }
  });

  it('requests cover art at least as wide as the tile draws at 2x on tablet and desktop', () => {
    for (const width of [768, 1024, 1390]) {
      const { tileWidth, coverArtSize } = albumGridLayout(width, 2);
      expect(coverArtSize).toBeGreaterThanOrEqual(tileWidth * 2);
    }
  });

  it('requests cover art that covers the physical tile width below the largest size', () => {
    for (const width of [320, 375, 515, 768, 1390]) {
      for (const scale of [1, 2, 3]) {
        const { tileWidth, coverArtSize } = albumGridLayout(width, scale);
        if (coverArtSize !== CoverArtSize.detail) {
          expect(coverArtSize).toBeGreaterThanOrEqual(tileWidth * scale);
        }
      }
    }
  });
});
