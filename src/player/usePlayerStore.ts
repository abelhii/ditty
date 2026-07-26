import { create } from 'zustand';

import { createQueueState, type QueueState } from '@/player/QueueManager';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

/**
 * Single source of truth for playback (ADR 0001, docs/adr/0001-player-state-flows-through-store.md).
 * `PlaybackController` only ever writes the "proposed" fields (queue, desiredPlaying,
 * seekRequest); `AudioEngine` is the only thing that writes the "observed" fields (status,
 * position) back, after actually driving the `<Audio>` ref.
 */
type PlayerState = {
  queue: QueueState;
  desiredPlaying: boolean;
  /** One-shot seek target in seconds. Set by PlaybackController, consumed and cleared by
   *  AudioEngine once the seek has been issued. */
  seekRequest: number | null;

  status: PlaybackStatus;
  /** Seconds, as last reported by `<Audio>`'s onPositionChange. */
  position: number;

  setQueue: (queue: QueueState) => void;
  setDesiredPlaying: (desiredPlaying: boolean) => void;
  requestSeek: (seconds: number) => void;
  clearSeekRequest: () => void;

  setStatus: (status: PlaybackStatus) => void;
  setPosition: (position: number) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  queue: createQueueState([]),
  desiredPlaying: false,
  seekRequest: null,

  status: 'idle',
  position: 0,

  setQueue: (queue) => set({ queue }),
  setDesiredPlaying: (desiredPlaying) => set({ desiredPlaying }),
  requestSeek: (seconds) => set({ seekRequest: seconds }),
  clearSeekRequest: () => set({ seekRequest: null }),

  setStatus: (status) => set({ status }),
  setPosition: (position) => set({ position }),
}));
