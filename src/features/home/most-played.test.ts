import type { Track } from '@/api/types';
import { rankMostPlayed } from '@/features/home/most-played';

function track(id: string, playCount?: number): Track {
  return { id, title: id, artist: 'A', album: 'B', duration: 100, starred: false, playCount };
}

describe('rankMostPlayed', () => {
  it('orders by play count, highest first', () => {
    const ranked = rankMostPlayed([track('a', 2), track('b', 9), track('c', 5)]);
    expect(ranked.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('drops tracks with missing or zero counts', () => {
    expect(rankMostPlayed([track('a'), track('b', 0), track('c', 1)]).map((t) => t.id)).toEqual(['c']);
  });

  it('keeps input order for ties', () => {
    expect(rankMostPlayed([track('a', 3), track('b', 3), track('c', 3)]).map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('keeps a track once when it appears twice', () => {
    expect(rankMostPlayed([track('a', 3), track('a', 3)])).toHaveLength(1);
  });

  it('returns an empty list for empty input', () => {
    expect(rankMostPlayed([])).toEqual([]);
  });

  it('respects the limit', () => {
    expect(rankMostPlayed([track('a', 3), track('b', 2), track('c', 1)], 2)).toHaveLength(2);
  });
});
