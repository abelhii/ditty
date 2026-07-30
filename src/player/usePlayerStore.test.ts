import type { Track } from '@/api/types';
import { createQueueState } from '@/player/QueueManager';

// In-memory stand-in for kvStorage so persist has somewhere sync to read/write. `mockStore` is
// prefixed `mock` so jest.mock's factory is allowed to close over it (module-scope escape rule).
let mockStore: Record<string, string>;
jest.mock('@/api/kvStorage', () => ({
  getItem: (key: string) => (key in mockStore ? mockStore[key] : null),
  setItem: (key: string, value: string) => {
    mockStore[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
}));

const PERSIST_KEY = 'music-player-queue';

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}
const tracks = [track('a'), track('b'), track('c')];

/** Seeds storage with the zustand persist envelope for a given saved queue. */
function seed(queue: unknown, version = 1) {
  mockStore[PERSIST_KEY] = JSON.stringify({ state: { queue }, version });
}

/** Re-imports usePlayerStore with a clean module registry so persist re-hydrates from whatever
 *  `mockStore` currently holds. */
function loadStore() {
  let store!: typeof import('@/player/usePlayerStore').usePlayerStore;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic re-import is the
    // point: a fresh module instance re-runs persist hydration against the current mockStore.
    store = require('@/player/usePlayerStore').usePlayerStore;
  });
  return store;
}

beforeEach(() => {
  mockStore = {};
  jest.resetModules();
});

describe('usePlayerStore persistence', () => {
  it('persists only the queue on mutation, not desiredPlaying/seekRequest', () => {
    const store = loadStore();
    store.getState().setQueue(createQueueState(tracks, 1));
    store.getState().setDesiredPlaying(true);
    store.getState().requestSeek(42);

    const persisted = JSON.parse(mockStore[PERSIST_KEY]);
    expect(Object.keys(persisted.state)).toEqual(['queue']);
    expect(persisted.state.queue.currentIndex).toBe(1);
    expect(persisted.version).toBe(1);
  });

  it('restores a saved queue (with shuffle/repeat) paused, from the start', () => {
    seed({ ...createQueueState(tracks, 2), shuffle: true, repeat: 'all' });
    const store = loadStore();

    const state = store.getState();
    expect(state.queue.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(state.queue.currentIndex).toBe(2);
    expect(state.queue.shuffle).toBe(true);
    expect(state.queue.repeat).toBe('all');
    // Restore is always paused (desiredPlaying not persisted).
    expect(state.desiredPlaying).toBe(false);
  });

  it('clamps a queue that finished last session back to its first track', () => {
    seed({ ...createQueueState(tracks), currentIndex: tracks.length });
    expect(loadStore().getState().queue.currentIndex).toBe(0);
  });

  it('resets to an empty queue when the stored blob is corrupt', () => {
    mockStore[PERSIST_KEY] = 'not-valid-json{';
    const state = loadStore().getState();
    expect(state.queue.tracks).toEqual([]);
    expect(state.queue.currentIndex).toBe(-1);
  });

  it('resets to an empty queue on a version mismatch', () => {
    seed(createQueueState(tracks, 1), 0);
    const state = loadStore().getState();
    expect(state.queue.tracks).toEqual([]);
    expect(state.queue.currentIndex).toBe(-1);
  });

  it('reset() empties the queue and stops playback', () => {
    const store = loadStore();
    store.getState().setQueue(createQueueState(tracks, 1));
    store.getState().setDesiredPlaying(true);

    store.getState().reset();

    expect(store.getState().queue.tracks).toEqual([]);
    expect(store.getState().desiredPlaying).toBe(false);
  });
});
