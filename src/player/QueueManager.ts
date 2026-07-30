import type { Track } from '@/api/types';

export type RepeatMode = 'off' | 'one' | 'all';

export type QueueState = {
  /** Playback order — reflects shuffle when shuffle is on. */
  tracks: Track[];
  /** Insertion order, restored when shuffle is turned off. */
  originalOrder: Track[];
  /** Index into `tracks`. -1 when the queue is empty; equal to `tracks.length` when
   *  playback has run off the end with repeat off. */
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
};

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length - 1));
}

export function createQueueState(tracks: Track[], startIndex = 0): QueueState {
  return {
    tracks,
    originalOrder: tracks,
    currentIndex: tracks.length === 0 ? -1 : clampIndex(startIndex, tracks.length),
    shuffle: false,
    repeat: 'off',
  };
}

export function getCurrentTrack(state: QueueState): Track | undefined {
  return state.tracks[state.currentIndex];
}

/**
 * Normalises a queue rehydrated from local storage (ADR 0006). A queue that ran to completion
 * last session was saved with `currentIndex === tracks.length` (see `next`), which would restore
 * to a dead player; snap any out-of-range index on a non-empty queue back to 0 so "reopen → hit
 * play" works. An empty queue keeps its sentinel `currentIndex` (-1). shuffle/repeat/originalOrder
 * ride along untouched.
 */
export function restoreQueue(state: QueueState): QueueState {
  if (state.tracks.length === 0) return state;
  const inRange = state.currentIndex >= 0 && state.currentIndex < state.tracks.length;
  return inRange ? state : { ...state, currentIndex: 0 };
}

export function next(state: QueueState): QueueState {
  if (state.tracks.length === 0) return state;
  if (state.repeat === 'one') return state;

  const nextIndex = state.currentIndex + 1;
  if (nextIndex < state.tracks.length) {
    return { ...state, currentIndex: nextIndex };
  }

  if (state.repeat === 'all') {
    return { ...state, currentIndex: 0 };
  }

  // Ran off the end with repeat off — queue is "finished"; getCurrentTrack returns undefined.
  return { ...state, currentIndex: state.tracks.length };
}

export function previous(state: QueueState): QueueState {
  if (state.tracks.length === 0) return state;
  if (state.repeat === 'one') return state;

  const prevIndex = state.currentIndex - 1;
  if (prevIndex >= 0) {
    return { ...state, currentIndex: prevIndex };
  }

  if (state.repeat === 'all') {
    return { ...state, currentIndex: state.tracks.length - 1 };
  }

  return { ...state, currentIndex: 0 };
}

export function setRepeat(state: QueueState, repeat: RepeatMode): QueueState {
  return { ...state, repeat };
}

/** Adds a track to the end of the queue. */
export function enqueue(state: QueueState, track: Track): QueueState {
  return {
    ...state,
    tracks: [...state.tracks, track],
    originalOrder: [...state.originalOrder, track],
    currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex,
  };
}

/** Inserts a track immediately after the currently-playing one ("play next"). */
export function playNext(state: QueueState, track: Track): QueueState {
  const insertAt = state.currentIndex === -1 ? 0 : state.currentIndex + 1;
  return {
    ...state,
    tracks: [...state.tracks.slice(0, insertAt), track, ...state.tracks.slice(insertAt)],
    originalOrder: [...state.originalOrder, track],
    currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex,
  };
}

/** Inserts a track at the current position and makes it the current track — the previously-playing
 *  track becomes next, the rest of the queue preserved after it. Search's "play now, keep the
 *  queue" (see docs/adr/0004-search-tap-preserves-queue.md); contrast with `play`, which replaces
 *  the whole queue. */
export function playNow(state: QueueState, track: Track): QueueState {
  const insertAt = state.currentIndex === -1 ? 0 : state.currentIndex;
  return {
    ...state,
    tracks: [...state.tracks.slice(0, insertAt), track, ...state.tracks.slice(insertAt)],
    originalOrder: [...state.originalOrder, track],
    currentIndex: insertAt,
  };
}

export function removeAt(state: QueueState, index: number): QueueState {
  if (index < 0 || index >= state.tracks.length) return state;

  const removed = state.tracks[index];
  const tracks = state.tracks.filter((_, i) => i !== index);
  const originalOrder = state.originalOrder.filter((t) => t !== removed);

  let currentIndex = state.currentIndex;
  if (tracks.length === 0) {
    currentIndex = -1;
  } else if (index < state.currentIndex) {
    currentIndex -= 1;
  } else if (index === state.currentIndex) {
    currentIndex = clampIndex(currentIndex, tracks.length);
  }

  return { ...state, tracks, originalOrder, currentIndex };
}

/** Moves the current position to `index` within the existing queue, leaving the track order
 *  untouched — the queue view's "tap a track to jump to it". Contrast `play`/`createQueueState`,
 *  which build a brand-new queue. Out-of-range indices are ignored. */
export function jumpTo(state: QueueState, index: number): QueueState {
  if (index < 0 || index >= state.tracks.length) return state;
  return { ...state, currentIndex: index };
}

export function reorder(state: QueueState, fromIndex: number, toIndex: number): QueueState {
  const inRange = (i: number) => i >= 0 && i < state.tracks.length;
  if (!inRange(fromIndex) || !inRange(toIndex) || fromIndex === toIndex) return state;

  const tracks = [...state.tracks];
  const [moved] = tracks.splice(fromIndex, 1);
  tracks.splice(toIndex, 0, moved);

  let currentIndex = state.currentIndex;
  if (state.currentIndex === fromIndex) {
    currentIndex = toIndex;
  } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
    currentIndex -= 1;
  } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
    currentIndex += 1;
  }

  return { ...state, tracks, currentIndex };
}

function shuffleArray<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** `random` is injectable for deterministic tests; defaults to `Math.random`. */
export function setShuffle(
  state: QueueState,
  shuffle: boolean,
  random: () => number = Math.random,
): QueueState {
  if (shuffle === state.shuffle) return state;

  if (!shuffle) {
    const current = getCurrentTrack(state);
    const currentIndex = current ? state.originalOrder.indexOf(current) : -1;
    return { ...state, tracks: state.originalOrder, shuffle: false, currentIndex };
  }

  const current = getCurrentTrack(state);
  const rest = state.tracks.filter((_, i) => i !== state.currentIndex);
  const shuffled = shuffleArray(rest, random);
  const tracks = current ? [current, ...shuffled] : shuffled;

  return { ...state, tracks, shuffle: true, currentIndex: current ? 0 : -1 };
}
