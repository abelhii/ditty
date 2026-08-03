import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';
import type { Track } from '@/api/types';
import { createQueueState, restoreQueue, type QueueState } from '@/player/QueueManager';

const PERSIST_KEY = 'music-player-queue';
const PERSIST_VERSION = 1;

/**
 * The *proposed* half of playback state (ADR 0001). `PlaybackController` only ever writes these
 * fields (queue, desiredPlaying, seekRequest); the *observed* fields (status, position) live in
 * `usePlaybackStatusStore` so the ~1/sec position tick during playback never reaches this store's
 * `persist` middleware. See docs/adr/0001-player-state-flows-through-store.md and
 * docs/adr/0006-local-only-queue-persistence.md.
 */
type PlayerState = {
  queue: QueueState;
  desiredPlaying: boolean;
  /** One-shot seek target in seconds. Set by PlaybackController, consumed and cleared by
   *  AudioEngine once the seek has been issued. */
  seekRequest: number | null;
  /** Bumped by `PlaybackController.retry()` to force AudioEngine to re-fetch the *same* track's
   *  stream after a playback error — the source string changes, so `<Audio>` reloads it without
   *  remounting (which would break the native AudioContext graph). Not persisted. */
  retryNonce: number;

  setQueue: (queue: QueueState) => void;
  setDesiredPlaying: (desiredPlaying: boolean) => void;
  requestSeek: (seconds: number) => void;
  clearSeekRequest: () => void;
  requestReload: () => void;

  /** Flips the `starred` flag on every queued copy of a track — keeps the now-playing/queue
   *  heart in sync with an optimistic favourite toggle (see features/favourites useStar/useUnstar). */
  setTrackStarred: (trackId: string, starred: boolean) => void;

  /** Empties the queue and stops playback — used by logout, which must not leak one account's
   *  queue (server-specific track ids) into the next. */
  reset: () => void;
};

/** Only the queue is durable across restarts — shuffle/repeat/originalOrder ride inside it.
 *  desiredPlaying is deliberately *not* persisted: restore is always paused (ADR 0006). */
type PersistedPlayerState = { queue: QueueState };

/**
 * `persist` calls `setItem`/`getItem` synchronously against this adapter. kvStorage is a sync
 * key-value store on every platform, so hydration happens during store creation — no async gate.
 * A corrupt blob (unparseable JSON) makes hydration throw, which `persist` swallows and leaves
 * the empty initial queue in place — the same "corrupt storage resets" behaviour as
 * `useAuthStore.hydrate`.
 */
const jsonStorage = createJSONStorage<PersistedPlayerState>(
  (): StateStorage => ({ getItem, setItem, removeItem }),
);

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      queue: createQueueState([]),
      desiredPlaying: false,
      seekRequest: null,
      retryNonce: 0,

      setQueue: (queue) => set({ queue }),
      setDesiredPlaying: (desiredPlaying) => set({ desiredPlaying }),
      requestSeek: (seconds) => set({ seekRequest: seconds }),
      clearSeekRequest: () => set({ seekRequest: null }),
      requestReload: () => set((state) => ({ retryNonce: state.retryNonce + 1 })),

      setTrackStarred: (trackId, starred) =>
        set((state) => {
          const patch = (track: Track) => (track.id === trackId ? { ...track, starred } : track);
          return {
            queue: {
              ...state.queue,
              tracks: state.queue.tracks.map(patch),
              originalOrder: state.queue.originalOrder.map(patch),
            },
          };
        }),

      reset: () => set({ queue: createQueueState([]), desiredPlaying: false, seekRequest: null }),
    }),
    {
      name: PERSIST_KEY,
      version: PERSIST_VERSION,
      storage: jsonStorage,
      partialize: (state): PersistedPlayerState => ({ queue: state.queue }),
      // A version bump (a future Track-shape change) resets to an empty queue rather than
      // migrating stale data — real migrate() handlers are deferred (ADR 0006).
      migrate: () => ({ queue: createQueueState([]) }),
      // Restore paused, from the current track's start: desiredPlaying stays at its initial
      // `false`, and a queue that finished last session re-cues from its top (index clamp).
      merge: (persisted, current) => {
        const saved = (persisted as PersistedPlayerState | undefined)?.queue;
        return { ...current, queue: saved ? restoreQueue(saved) : current.queue };
      },
    },
  ),
);
