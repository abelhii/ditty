import type { Track } from '@/api/types';

export type RepeatMode = 'off' | 'one' | 'all';

/** A Track in the Queue. `addedByUser` marks an entry put there by Add to Queue / Play next; it is
 *  cleared once playback reaches the entry. Absent on Queues persisted before the marker existed. */
export type QueueEntry = Track & { addedByUser?: boolean };

export type QueueState = {
  /** Playback order — reflects shuffle when shuffle is on. Upcoming user-added entries always come
   *  first (right after the current Track), then the source's own Tracks. */
  tracks: QueueEntry[];
  /** Insertion order, restored when shuffle is turned off. */
  originalOrder: QueueEntry[];
  /** Index into `tracks`. -1 when the queue is empty; equal to `tracks.length` when
   *  playback has run off the end with repeat off. */
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Name of what the Queue was seeded from (Playlist, album, ...); absent when unknown, e.g. a
   *  Queue persisted before this field existed. */
  source?: string;
};

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length - 1));
}

export function createQueueState(tracks: Track[], startIndex = 0, source?: string): QueueState {
  return {
    ...(source !== undefined && { source }),
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
 * Normalises a queue rehydrated from local storage. A queue that ran to completion
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

/** Moves upcoming user-added entries (stable) ahead of the source's own Tracks, restoring the
 *  invariant the Queue sections rely on after an operation that can interleave them. */
function groupUserAdded(state: QueueState): QueueState {
  const from = state.currentIndex + 1;
  if (from <= 0 || from >= state.tracks.length) return state;
  const upcoming = state.tracks.slice(from);
  const added = upcoming.filter((t) => t.addedByUser);
  if (added.length === 0 || added.length === upcoming.length) return state;
  const tracks = [
    ...state.tracks.slice(0, from),
    ...added,
    ...upcoming.filter((t) => !t.addedByUser),
  ];
  return { ...state, tracks };
}

/** Clears the user-added marker on every entry at or before the current one — it has been reached.
 *  Entries are replaced by reference in both lists so `originalOrder` stays in step with `tracks`. */
function clearReachedMarkers(state: QueueState): QueueState {
  const reached = state.tracks.slice(0, state.currentIndex + 1).filter((t) => t.addedByUser);
  if (reached.length === 0) return state;
  const cleared = new Map(reached.map((t) => [t, { ...t, addedByUser: undefined }]));
  const swap = (t: QueueEntry) => cleared.get(t) ?? t;
  return { ...state, tracks: state.tracks.map(swap), originalOrder: state.originalOrder.map(swap) };
}

/** After the current position moves (or a Track is played now): clears markers on the entries it has
 *  reached and re-groups: stepping back or playing a Track now turns the previous current Track into an
 *  upcoming source entry, which must not sit ahead of the user-added ones or the sections would split. */
function settleAfterMove(state: QueueState): QueueState {
  return groupUserAdded(clearReachedMarkers(state));
}

export function next(state: QueueState): QueueState {
  if (state.tracks.length === 0) return state;
  if (state.repeat === 'one') return state;

  const nextIndex = state.currentIndex + 1;
  if (nextIndex < state.tracks.length) {
    return clearReachedMarkers({ ...state, currentIndex: nextIndex });
  }

  if (state.repeat === 'all') {
    return clearReachedMarkers({ ...state, currentIndex: 0 });
  }

  // Ran off the end with repeat off — queue is "finished"; getCurrentTrack returns undefined.
  return clearReachedMarkers({ ...state, currentIndex: state.tracks.length });
}

export function previous(state: QueueState): QueueState {
  if (state.tracks.length === 0) return state;
  if (state.repeat === 'one') return state;

  const prevIndex = state.currentIndex - 1;
  if (prevIndex >= 0) {
    return settleAfterMove({ ...state, currentIndex: prevIndex });
  }

  if (state.repeat === 'all') {
    return settleAfterMove({ ...state, currentIndex: state.tracks.length - 1 });
  }

  return settleAfterMove({ ...state, currentIndex: 0 });
}

export function setRepeat(state: QueueState, repeat: RepeatMode): QueueState {
  return { ...state, repeat };
}

/** "Add to Queue": puts a track after the Tracks already added by the user and before the source's
 *  own Tracks, marked as user-added. Contrast `append`, which goes to the very end. */
export function enqueue(state: QueueState, track: Track): QueueState {
  let at = Math.min(state.currentIndex + 1, state.tracks.length);
  while (at < state.tracks.length && state.tracks[at].addedByUser) at++;
  const entry: QueueEntry = { ...track, addedByUser: true };
  return {
    ...state,
    tracks: [...state.tracks.slice(0, at), entry, ...state.tracks.slice(at)],
    originalOrder: [...state.originalOrder, entry],
    currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex,
  };
}

/** Adds a track to the very end of the queue, not marked as user-added (Auto-DJ's top-up). */
export function append(state: QueueState, track: Track): QueueState {
  return {
    ...state,
    tracks: [...state.tracks, track],
    originalOrder: [...state.originalOrder, track],
    currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex,
  };
}

/** Inserts a track immediately after the currently-playing one ("play next"), marked as user-added. */
export function playNext(state: QueueState, track: Track): QueueState {
  const insertAt = state.currentIndex === -1 ? 0 : state.currentIndex + 1;
  const entry: QueueEntry = { ...track, addedByUser: true };
  return {
    ...state,
    tracks: [...state.tracks.slice(0, insertAt), entry, ...state.tracks.slice(insertAt)],
    originalOrder: [...state.originalOrder, entry],
    currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex,
  };
}

/** Inserts a track at the current position and makes it the current track — the previously-playing
 *  track becomes next, the rest of the queue preserved after it. Search's "play now, keep the
 *  queue"; contrast with `play`, which replaces the whole queue. */
export function playNow(state: QueueState, track: Track): QueueState {
  const insertAt = state.currentIndex === -1 ? 0 : state.currentIndex;
  return groupUserAdded({
    ...state,
    tracks: [...state.tracks.slice(0, insertAt), track, ...state.tracks.slice(insertAt)],
    originalOrder: [...state.originalOrder, track],
    currentIndex: insertAt,
  });
}

export function removeAt(state: QueueState, index: number): QueueState {
  if (index < 0 || index >= state.tracks.length) return state;

  const removed = state.tracks[index];
  const tracks = state.tracks.filter((_, i) => i !== index);
  // Drop only one entry: the same Track object can be queued more than once.
  const originalIndex = state.originalOrder.indexOf(removed);
  const originalOrder = state.originalOrder.filter((_, i) => i !== originalIndex);

  let currentIndex = state.currentIndex;
  if (tracks.length === 0) {
    currentIndex = -1;
  } else if (index < state.currentIndex) {
    currentIndex -= 1;
  } else if (index === state.currentIndex) {
    currentIndex = clampIndex(currentIndex, tracks.length);
  }

  return clearReachedMarkers({ ...state, tracks, originalOrder, currentIndex });
}

/** Puts a previously removed track back at `index` (clamped), keeping the current track current —
 *  the undo of `removeAt`. `originalIndex` puts it back in the shuffle-off order too (default: end). */
export function insertAt(
  state: QueueState,
  track: Track,
  index: number,
  originalIndex: number = state.originalOrder.length,
): QueueState {
  const at = Math.max(0, Math.min(index, state.tracks.length));
  const tracks = [...state.tracks.slice(0, at), track, ...state.tracks.slice(at)];
  let currentIndex = state.currentIndex;
  if (currentIndex === -1) currentIndex = 0;
  else if (at <= currentIndex) currentIndex += 1;
  const o = Math.max(0, Math.min(originalIndex, state.originalOrder.length));
  const originalOrder = [...state.originalOrder.slice(0, o), track, ...state.originalOrder.slice(o)];
  return { ...state, tracks, originalOrder, currentIndex };
}

/** Moves the current position to `index` within the existing queue, leaving the track order
 *  untouched — the queue view's "tap a track to jump to it". Contrast `play`/`createQueueState`,
 *  which build a brand-new queue. Out-of-range indices are ignored. */
export function jumpTo(state: QueueState, index: number): QueueState {
  if (index < 0 || index >= state.tracks.length) return state;
  return settleAfterMove({ ...state, currentIndex: index });
}

/** Moves a track within the queue. A track dropped among the user-added entries becomes user-added;
 *  dropped among the source's Tracks it stops being one. Dropped exactly on the seam, it keeps the
 *  section it came from, so dragging to the bottom of a section doesn't change its section. */
export function reorder(state: QueueState, fromIndex: number, toIndex: number): QueueState {
  const inRange = (i: number) => i >= 0 && i < state.tracks.length;
  if (!inRange(fromIndex) || !inRange(toIndex) || fromIndex === toIndex) return state;

  const tracks = [...state.tracks];
  const [moved] = tracks.splice(fromIndex, 1);

  let currentIndex = state.currentIndex;
  if (state.currentIndex === fromIndex) {
    currentIndex = toIndex;
  } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
    currentIndex -= 1;
  } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
    currentIndex += 1;
  }

  let entry: QueueEntry = moved;
  if (fromIndex !== state.currentIndex) {
    // The current Track's position among the *other* entries (`tracks` has `moved` removed).
    const othersCurrent = state.currentIndex - (fromIndex < state.currentIndex ? 1 : 0);
    if (toIndex > othersCurrent) {
      let blockEnd = othersCurrent + 1;
      while (blockEnd < tracks.length && tracks[blockEnd].addedByUser) blockEnd++;
      const marked = toIndex < blockEnd || (toIndex === blockEnd && !!moved.addedByUser);
      if (marked !== !!moved.addedByUser) entry = { ...moved, addedByUser: marked || undefined };
    }
  }
  tracks.splice(toIndex, 0, entry);

  const swap = (t: QueueEntry) => (t === moved ? entry : t);
  const originalOrder = entry === moved ? state.originalOrder : state.originalOrder.map(swap);
  return clearReachedMarkers(groupUserAdded({ ...state, tracks, originalOrder, currentIndex }));
}

/** Empties the queue, keeping shuffle and repeat. */
export function clear(state: QueueState): QueueState {
  return { ...createQueueState([]), shuffle: state.shuffle, repeat: state.repeat };
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
    return groupUserAdded({ ...state, tracks: state.originalOrder, shuffle: false, currentIndex });
  }

  const current = getCurrentTrack(state);
  const rest = state.tracks.filter((_, i) => i !== state.currentIndex);
  // User-added entries stay up front, in order; only the source's Tracks are shuffled.
  const shuffled = [
    ...rest.filter((t) => t.addedByUser),
    ...shuffleArray(
      rest.filter((t) => !t.addedByUser),
      random,
    ),
  ];
  const tracks = current ? [current, ...shuffled] : shuffled;

  return { ...state, tracks, shuffle: true, currentIndex: current ? 0 : -1 };
}
