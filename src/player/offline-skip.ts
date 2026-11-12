import type { Track } from '@/api/types';
import type { QueueState } from '@/player/QueueManager';
import { getCurrentTrack } from '@/player/QueueManager';

/**
 * Applies `step` (QueueManager's `next`/`previous`, or the identity when starting a queue) and keeps
 * stepping while the landed-on Track isn't playable — used in Offline mode to skip Tracks that were
 * never downloaded, instead of halting on a stream error.
 *
 * Bounded by the queue length so a queue with nothing playable can't spin, and stops when a step
 * doesn't move (repeat-one, or `previous` at the start). If nothing playable is reachable the last
 * state is returned, so the caller still lands somewhere sane.
 */
export function stepToPlayable(
  state: QueueState,
  step: (state: QueueState) => QueueState,
  isPlayable: (track: Track) => boolean,
): QueueState {
  let current = step(state);
  for (let i = 0; i < state.tracks.length; i++) {
    const track = getCurrentTrack(current);
    if (!track || isPlayable(track)) return current;
    const advanced = step(current);
    if (advanced.currentIndex === current.currentIndex) return current;
    current = advanced;
  }
  return current;
}
