import { create } from 'zustand';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

/**
 * The *observed* half of playback state, split out of `usePlayerStore` (ADR 0006,
 * docs/adr/0006-local-only-queue-persistence.md). These fields are written by `AudioEngine`
 * from what `<Audio>` actually reports — `position` in particular ticks ~once a second during
 * playback. Keeping them out of the persisted store is what lets `usePlayerStore` wrap itself in
 * `persist` without a SQLite write on every position tick. Contrast the proposed state
 * (queue / desiredPlaying / seekRequest) that still lives in `usePlayerStore`.
 */
type PlaybackStatusState = {
  status: PlaybackStatus;
  /** Seconds, as last reported by `<Audio>`'s onPositionChange. */
  position: number;

  setStatus: (status: PlaybackStatus) => void;
  setPosition: (position: number) => void;
};

export const usePlaybackStatusStore = create<PlaybackStatusState>((set) => ({
  status: 'idle',
  position: 0,

  setStatus: (status) => set({ status }),
  setPosition: (position) => set({ position }),
}));
