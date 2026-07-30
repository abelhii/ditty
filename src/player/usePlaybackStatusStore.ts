import { create } from 'zustand';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

/** Message wording for a halted (`status: 'error'`) track, flavoured by the connectivity probe.
 *  `null` while the async probe is still in flight — treated as a generic failure until it resolves. */
export function playbackErrorMessage(errorOffline: boolean | null): string {
  return errorOffline ? "You're offline" : "Couldn't play this track";
}

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
  /** When `status === 'error'`, whether the stream failed because the device is offline. `null`
   *  until the async connectivity probe in AudioEngine's onError resolves a beat later (ADR 0007). */
  errorOffline: boolean | null;

  setStatus: (status: PlaybackStatus) => void;
  setPosition: (position: number) => void;
  /** Halt the current track: `status: 'error'`, reason unknown until {@link setErrorOffline}. */
  reportError: () => void;
  setErrorOffline: (offline: boolean) => void;
};

export const usePlaybackStatusStore = create<PlaybackStatusState>((set) => ({
  status: 'idle',
  position: 0,
  errorOffline: null,

  setStatus: (status) => set({ status }),
  setPosition: (position) => set({ position }),
  reportError: () => set({ status: 'error', errorOffline: null }),
  setErrorOffline: (offline) => set({ errorOffline: offline }),
}));
