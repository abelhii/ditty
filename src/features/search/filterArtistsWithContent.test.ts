import type { Artist } from '@/api/types';
import { filterArtistsWithContent } from '@/features/search/filterArtistsWithContent';

function artist(id: string, albumCount: number): Artist {
  return { id, name: `Artist ${id}`, albumCount };
}

describe('filterArtistsWithContent', () => {
  it('drops artists with no albums', () => {
    const artists = [artist('1', 3), artist('2', 0), artist('3', 1)];
    expect(filterArtistsWithContent(artists).map((a) => a.id)).toEqual(['1', '3']);
  });

  it('keeps every artist when all have content', () => {
    const artists = [artist('1', 2), artist('2', 5)];
    expect(filterArtistsWithContent(artists)).toHaveLength(2);
  });
});
