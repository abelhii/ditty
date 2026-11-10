import { getCurrentTrack } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';

/** Whether `trackId` is the Queue's current Track. Subscribes to a boolean, so a row re-renders only
 *  when its own state flips, not on every queue change. */
export function useIsCurrentTrack(trackId: string): boolean {
  return usePlayerStore((state) => getCurrentTrack(state.queue)?.id === trackId);
}
