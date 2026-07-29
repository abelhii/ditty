import { create } from 'zustand';

/**
 * Visibility of the two full-screen player-shell overlays (now-playing + queue). Kept separate
 * from `usePlayerStore` (which owns actual playback state) — this is pure presentation state, and
 * the MiniPlayer / overlays are JS overlays rather than router routes (ADR 0005 established the
 * overlay approach for the MiniPlayer; step 7a extends it to now-playing/queue). The queue overlay
 * sits above now-playing, so closing now-playing also closes the queue.
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
