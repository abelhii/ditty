import { create } from 'zustand';

import { getCurrentTrack } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';

/**
 * Visibility of the two full-screen player-shell overlays (now-playing + queue). Kept separate
 * from `usePlayerStore` (which owns actual playback state) — this is pure presentation state, and
 * the MiniPlayer / overlays are JS overlays rather than router routes (the overlay approach was
 * established for the MiniPlayer; step 7a extends it to now-playing/queue). The queue overlay sits
 * above now-playing, so closing now-playing also closes the queue.
 */
type PlayerUiState = {
  nowPlayingOpen: boolean;
  queueOpen: boolean;
  openNowPlaying: () => void;
  closeNowPlaying: () => void;
  openQueue: () => void;
  closeQueue: () => void;
};

export const usePlayerUiStore = create<PlayerUiState>((set) => ({
  nowPlayingOpen: false,
  queueOpen: false,
  openNowPlaying: () => set({ nowPlayingOpen: true }),
  closeNowPlaying: () => set({ nowPlayingOpen: false, queueOpen: false }),
  openQueue: () => set({ queueOpen: true }),
  closeQueue: () => set({ queueOpen: false }),
}));

// The full player has nothing to show once there is no current track (the Queue ran out, was
// emptied, or was reset on logout). Close it then, rather than leaving `nowPlayingOpen` set: a
// stale flag would hide the MiniPlayer and pop the full player open on the next track.
usePlayerStore.subscribe((state) => {
  if (!getCurrentTrack(state.queue) && usePlayerUiStore.getState().nowPlayingOpen) {
    usePlayerUiStore.getState().closeNowPlaying();
  }
});
