import { homeShelves, SHELF_SIZE } from '@/features/home/shelves';

describe('homeShelves', () => {
  it('returns the three discover facets in order', () => {
    expect(homeShelves(2026).map((shelf) => shelf.id)).toEqual([
      'recentlyAdded',
      'newReleases',
      'explore',
    ]);
  });

  it('maps each shelf to its getAlbumList2 ordering', () => {
    const byId = Object.fromEntries(homeShelves(2026).map((shelf) => [shelf.id, shelf.params.type]));
    expect(byId).toEqual({ recentlyAdded: 'newest', newReleases: 'byYear', explore: 'random' });
  });

  it('windows New Releases newest-first (fromYear > toYear) from the given year', () => {
    const newReleases = homeShelves(2026).find((shelf) => shelf.id === 'newReleases')!;
    expect(newReleases.params.fromYear).toBe(2026);
    expect(newReleases.params.toYear).toBe(2021);
    expect(newReleases.params.fromYear!).toBeGreaterThan(newReleases.params.toYear!);
  });

  it('requests SHELF_SIZE albums for every shelf', () => {
    for (const shelf of homeShelves(2026)) {
      expect(shelf.params.size).toBe(SHELF_SIZE);
    }
  });
});
