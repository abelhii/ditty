import type { Track } from '@/api/types';

/** How many ids the Auto-DJ remembers across Queues, so a fresh Queue doesn't replay what it just
 *  generated. */
export const RECENT_WINDOW = 50;
/** Tracks appended per refill. */
export const BATCH_SIZE = 10;
/** Share of picks (0..1) taken from the any-genre pool instead of the same-genre/similar pool. */
export const DEFAULT_RANDOMNESS = 0.3;
/** Refill when this many or fewer Tracks remain after the current one. */
export const REFILL_THRESHOLD = 2;

export type CandidatePools = {
  /** Last.fm-backed similar Tracks, when the server has any. Preferred over `genre`. */
  similar: Track[];
  /** Random Tracks of the seed's genre. */
  genre: Track[];
  /** Random Tracks from anywhere. */
  random: Track[];
};

export type PickParams = {
  pools: CandidatePools;
  /** Ids to skip: everything already in the Queue plus the recent-history window. */
  excludeIds: ReadonlySet<string>;
  randomness?: number;
  batchSize?: number;
  /** Injectable for deterministic tests; defaults to `Math.random`. */
  random?: () => number;
};

/**
 * Picks the next Auto-DJ batch. Each slot rolls against `randomness`: a hit takes the next unused
 * Track from the any-genre pool, a miss takes the next from similar-then-genre. A pool that runs
 * dry falls through to the others, so the batch is only short when every pool is exhausted.
 * Tracks in `excludeIds` and duplicates are never returned. Pools are consumed in order — the
 * server already randomised them.
 */
export function pickNextBatch({
  pools,
  excludeIds,
  randomness = DEFAULT_RANDOMNESS,
  batchSize = BATCH_SIZE,
  random = Math.random,
}: PickParams): Track[] {
  const taken = new Set(excludeIds);
  const take = (list: Track[]): Track | undefined => {
    const found = list.find((t) => !taken.has(t.id));
    if (found) taken.add(found.id);
    return found;
  };

  const focused = [...pools.similar, ...pools.genre];
  const picked: Track[] = [];
  while (picked.length < batchSize) {
    const wantRandom = random() < randomness;
    const track = wantRandom
      ? (take(pools.random) ?? take(focused))
      : (take(focused) ?? take(pools.random));
    if (!track) break;
    picked.push(track);
  }
  return picked;
}
