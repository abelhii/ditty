import type { Track } from '@/api/types';
import { pickNextBatch, type CandidatePools } from '@/player/auto-dj';

function track(id: string): Track {
  return { id, title: id, artist: 'A', album: 'B', duration: 1, starred: false };
}
const ids = (tracks: Track[]) => tracks.map((t) => t.id);
const none = new Set<string>();

const pools: CandidatePools = {
  similar: [track('s1')],
  genre: [track('g1'), track('g2')],
  random: [track('r1'), track('r2')],
};

describe('pickNextBatch', () => {
  it('with randomness 0 uses only similar then genre tracks', () => {
    const batch = pickNextBatch({ pools, excludeIds: none, randomness: 0, batchSize: 3, random: () => 0.5 });
    expect(ids(batch)).toEqual(['s1', 'g1', 'g2']);
  });

  it('with randomness 1 uses the random pool first', () => {
    const batch = pickNextBatch({ pools, excludeIds: none, randomness: 1, batchSize: 2, random: () => 0.5 });
    expect(ids(batch)).toEqual(['r1', 'r2']);
  });

  it('falls through to the other pool when one runs dry, then stops short', () => {
    const batch = pickNextBatch({ pools, excludeIds: none, randomness: 0, batchSize: 10, random: () => 0.5 });
    expect(ids(batch)).toEqual(['s1', 'g1', 'g2', 'r1', 'r2']);
  });

  it('skips excluded ids', () => {
    const batch = pickNextBatch({
      pools,
      excludeIds: new Set(['s1', 'r1']),
      randomness: 0,
      batchSize: 10,
      random: () => 0.5,
    });
    expect(ids(batch)).toEqual(['g1', 'g2', 'r2']);
  });

  it('never returns a track that appears in two pools twice', () => {
    const dup: CandidatePools = { similar: [], genre: [track('x')], random: [track('x'), track('y')] };
    const batch = pickNextBatch({ pools: dup, excludeIds: none, randomness: 0.5, batchSize: 10, random: () => 0.9 });
    expect(ids(batch).sort()).toEqual(['x', 'y']);
  });

  it('returns an empty batch when every pool is empty or excluded', () => {
    const empty: CandidatePools = { similar: [], genre: [], random: [] };
    expect(pickNextBatch({ pools: empty, excludeIds: none })).toEqual([]);
    expect(pickNextBatch({ pools, excludeIds: new Set(['s1', 'g1', 'g2', 'r1', 'r2']) })).toEqual([]);
  });
});
