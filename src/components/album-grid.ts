import { coverArtSizeFor } from '@/api/subsonic/endpoints/media';
import { MaxContentWidth, SidebarWidth, Spacing, WideMaxContentWidth } from '@/constants/theme';

/** Gap between album grid tiles, both across a row and between rows. */
export const AlbumGridGap = Spacing.four;

/** Narrowest tile before the grid drops a column. Phones keep two columns; wider windows add
 *  columns instead of growing tiles. */
const MIN_TILE_WIDTH = 140;
const MIN_COLUMNS = 2;

export type AlbumGridLayout = {
  columns: number;
  tileWidth: number;
  /** Cover art size to request, so covers stay sharp at `tileWidth`. */
  coverArtSize: number;
};

/** Inner width of the content pane in the wide layout: the window minus the sidebar, capped at
 *  `WideMaxContentWidth`, less the `Spacing.four` side padding. */
export function widePaneContentWidth(windowWidth: number): number {
  return Math.min(windowWidth - SidebarWidth, WideMaxContentWidth) - Spacing.four * 2;
}

/** Layout for the album grids (Search, My Music, Genre, Artist). They draw inside the centred
 *  `MaxContentWidth` column with `Spacing.four` side padding, or, when `wide`, inside the
 *  sidebar layout's content pane. */
export function albumGridLayout(
  windowWidth: number,
  pixelRatio: number,
  wide = false,
): AlbumGridLayout {
  const contentWidth = wide
    ? widePaneContentWidth(windowWidth)
    : Math.min(windowWidth, MaxContentWidth) - Spacing.four * 2;
  const columns = Math.max(
    MIN_COLUMNS,
    Math.floor((contentWidth + AlbumGridGap) / (MIN_TILE_WIDTH + AlbumGridGap)),
  );
  const tileWidth = (contentWidth - AlbumGridGap * (columns - 1)) / columns;
  return { columns, tileWidth, coverArtSize: coverArtSizeFor(tileWidth, pixelRatio) };
}
