import { usePlayerStore } from '@/player/use-player-store';

/** The Track after the current one in the Queue, or undefined on the last Track (or an empty Queue). */
export function useNextTrack() {
  return usePlayerStore((state) => state.queue.tracks[state.queue.currentIndex + 1]);
}
