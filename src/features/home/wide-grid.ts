import { AlbumGridGap, widePaneContentWidth } from '@/components/album-grid';
import type { Artist } from '@/api/types';

/** Narrowest tile on the wide Home's album and artist rows before a column is dropped. */
const MIN_TILE_WIDTH = 150;
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 6;

/** Columns for the wide Home's album and artist rows: 6 on a large window, reflowing to 4 and
 *  then 3 as the content pane narrows. */
export function wideColumnCount(contentWidth: number): number {
  const fit = Math.floor((contentWidth + AlbumGridGap) / (MIN_TILE_WIDTH + AlbumGridGap));
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, fit));
}

export type WideHomeLayout = {
  contentWidth: number;
  columns: number;
  tileWidth: number;
};

/** Content width, column count and tile width of the wide Home's album and artist rows. */
export function wideHomeLayout(windowWidth: number): WideHomeLayout {
  const contentWidth = widePaneContentWidth(windowWidth);
  const columns = wideColumnCount(contentWidth);
  const tileWidth = (contentWidth - AlbumGridGap * (columns - 1)) / columns;
  return { contentWidth, columns, tileWidth };
}

/** Up to `count` artists picked at random without repeats, for the Explore artists shelf.
 *  `random` is injected so the pick is deterministic under test. */
export function sampleArtists(artists: Artist[], count: number, random: () => number): Artist[] {
  const pool = [...artists];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
