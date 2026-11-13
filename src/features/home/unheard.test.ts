import type { Track } from '@/api/types';
import { rankUnheard } from '@/features/home/unheard';

function track(id: string, playCount?: number): Track {
  return { id, title: id, artist: 'A', album: 'B', duration: 100, starred: false, playCount };
}

const ids = (tracks: Track[]) => tracks.map((t) => t.id);

describe('rankUnheard', () => {
  it('returns only never-played Tracks when any exist', () => {
    const result = rankUnheard([track('a', 3), track('b'), track('c', 1)]);
    expect(result.kind).toBe('unheard');
    expect(ids(result.tracks)).toEqual(['b']);
  });

  it('treats missing, zero and negative counts as unheard', () => {
    const result = rankUnheard([track('a'), track('b', 0), track('c', -1), track('d', 2)]);
    expect(result.kind).toBe('unheard');
    expect(ids(result.tracks)).toEqual(['a', 'b', 'c']);
  });

  it('keeps sample order among unheard Tracks and respects the limit', () => {
    const result = rankUnheard([track('a'), track('b'), track('c')], 2);
    expect(ids(result.tracks)).toEqual(['a', 'b']);
  });

  it('falls back to least played, fewest plays first, when none are unheard', () => {
    const result = rankUnheard([track('a', 5), track('b', 1), track('c', 3)]);
    expect(result.kind).toBe('leastPlayed');
    expect(ids(result.tracks)).toEqual(['b', 'c', 'a']);
  });

  it('keeps sample order for least-played ties', () => {
    const result = rankUnheard([track('a', 2), track('b', 2), track('c', 2)]);
    expect(ids(result.tracks)).toEqual(['a', 'b', 'c']);
  });

  it('limits the least-played list', () => {
    const result = rankUnheard([track('a', 4), track('b', 2), track('c', 3)], 2);
    expect(ids(result.tracks)).toEqual(['b', 'c']);
  });

  it('keeps a Track once when it appears twice', () => {
    expect(rankUnheard([track('a'), track('a')]).tracks).toHaveLength(1);
  });

  it('returns an empty unheard list for empty input', () => {
    expect(rankUnheard([])).toEqual({ kind: 'unheard', tracks: [] });
  });
});
