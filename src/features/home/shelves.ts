import type { AlbumListParams } from '@/api/subsonic/endpoints/browsing';

/** How many albums each Home shelf fetches — a single unpaginated getAlbumList2 call, rendered as
 *  a horizontal carousel (no pagination / "See all" for a shelf; the full lists live elsewhere). */
export const SHELF_SIZE = 20;

/** How many years back "New Releases" reaches, by the album's own release year (not date-added). */
const NEW_RELEASE_WINDOW_YEARS = 5;

export type ShelfId = 'recentlyAdded' | 'newReleases' | 'explore';

export type Shelf = {
  id: ShelfId;
  title: string;
  params: AlbumListParams;
};

/**
 * The Home/discover shelves (Build Order step 9) — client-side groupings over `getAlbumList2`,
 * deliberately faceted *browse* with no text query (that's Search's job). Three distinct facets:
 *
 * - **Recently Added** (`newest`): by date added to the server's scan/import.
 * - **New Releases** (`byYear`): by the album's own release year, newest first — a
 *   `fromYear > toYear` window, distinct from date-added. (`byYear` is the closest getAlbumList2
 *   ordering to OpenSubsonic's `originalReleaseDate`; year granularity is enough for MVP.)
 * - **Explore** (`random`): pure discovery. `recent`/`frequent` are the same mechanism and are the
 *   obvious follow-up shelves if this feels thin.
 *
 * Pure + unit-tested; `currentYear` is injected so the year window is deterministic under test.
 */
export function homeShelves(currentYear: number): Shelf[] {
  return [
    { id: 'recentlyAdded', title: 'Recently Added', params: { type: 'newest', size: SHELF_SIZE } },
    {
      id: 'newReleases',
      title: 'New Releases',
      params: {
        type: 'byYear',
        size: SHELF_SIZE,
        fromYear: currentYear,
        toYear: currentYear - NEW_RELEASE_WINDOW_YEARS,
      },
    },
    { id: 'explore', title: 'Explore', params: { type: 'random', size: SHELF_SIZE } },
  ];
}
