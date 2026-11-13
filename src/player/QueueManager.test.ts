import type { Track } from '@/api/types';
import {
  append,
  clear,
  createQueueState,
  enqueue,
  getCurrentTrack,
  insertAt,
  jumpTo,
  next,
  playNext,
  playNow,
  previous,
  removeAt,
  reorder,
  restoreQueue,
  setRepeat,
  setShuffle,
} from '@/player/QueueManager';

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

const tracks = [track('a'), track('b'), track('c')];

describe('createQueueState', () => {
  it('starts at index 0 by default', () => {
    const state = createQueueState(tracks);
    expect(state.currentIndex).toBe(0);
    expect(getCurrentTrack(state)?.id).toBe('a');
  });

  it('starts empty with currentIndex -1', () => {
    const state = createQueueState([]);
    expect(state.currentIndex).toBe(-1);
    expect(getCurrentTrack(state)).toBeUndefined();
  });

  it('clamps an out-of-range startIndex', () => {
    const state = createQueueState(tracks, 10);
    expect(state.currentIndex).toBe(2);
  });
});

describe('next', () => {
  it('advances to the next track', () => {
    const state = next(createQueueState(tracks, 0));
    expect(getCurrentTrack(state)?.id).toBe('b');
  });

  it('with repeat off, runs off the end past the last track', () => {
    const state = next(createQueueState(tracks, 2));
    expect(state.currentIndex).toBe(3);
    expect(getCurrentTrack(state)).toBeUndefined();
  });

  it('with repeat all, wraps to the first track', () => {
    const withRepeat = setRepeat(createQueueState(tracks, 2), 'all');
    const state = next(withRepeat);
    expect(getCurrentTrack(state)?.id).toBe('a');
  });

  it('with repeat one, stays on the same track', () => {
    const withRepeat = setRepeat(createQueueState(tracks, 1), 'one');
    const state = next(withRepeat);
    expect(getCurrentTrack(state)?.id).toBe('b');
  });

  it('is a no-op on an empty queue', () => {
    const state = next(createQueueState([]));
    expect(state.currentIndex).toBe(-1);
  });
});

describe('previous', () => {
  it('goes back to the previous track', () => {
    const state = previous(createQueueState(tracks, 1));
    expect(getCurrentTrack(state)?.id).toBe('a');
  });

  it('with repeat off, clamps at the first track', () => {
    const state = previous(createQueueState(tracks, 0));
    expect(getCurrentTrack(state)?.id).toBe('a');
  });

  it('with repeat all, wraps to the last track', () => {
    const withRepeat = setRepeat(createQueueState(tracks, 0), 'all');
    const state = previous(withRepeat);
    expect(getCurrentTrack(state)?.id).toBe('c');
  });

  it('with repeat one, stays on the same track', () => {
    const withRepeat = setRepeat(createQueueState(tracks, 1), 'one');
    const state = previous(withRepeat);
    expect(getCurrentTrack(state)?.id).toBe('b');
  });
});

describe('enqueue', () => {
  it('goes right after the current track when nothing is user-added yet, marked as user-added', () => {
    const state = enqueue(createQueueState(tracks, 1), track('d'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b', 'd', 'c']);
    expect(state.tracks[2].addedByUser).toBe(true);
    expect(state.currentIndex).toBe(1);
  });

  it('queues behind earlier user-added tracks but ahead of the source tracks', () => {
    let state = createQueueState(tracks, 0);
    state = enqueue(state, track('x'));
    state = enqueue(state, track('y'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'x', 'y', 'b', 'c']);
  });

  it('goes after a Play next track, which sits at the front of the user-added block', () => {
    let state = enqueue(createQueueState(tracks, 0), track('x'));
    state = playNext(state, track('y'));
    state = enqueue(state, track('z'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'y', 'x', 'z', 'b', 'c']);
  });

  it('starts playback when enqueued onto an empty queue', () => {
    const state = enqueue(createQueueState([]), track('a'));
    expect(state.currentIndex).toBe(0);
    expect(state.tracks.map((t) => t.id)).toEqual(['a']);
  });

  it('does not mutate the Track it was given', () => {
    const t = track('d');
    enqueue(createQueueState(tracks, 0), t);
    expect('addedByUser' in t).toBe(false);
  });

  it('records the same entry in originalOrder', () => {
    const state = enqueue(createQueueState(tracks, 0), track('d'));
    expect(state.originalOrder.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.originalOrder[3]).toBe(state.tracks[1]);
  });
});

describe('append', () => {
  it('adds to the very end without marking the track as user-added', () => {
    const state = append(createQueueState(tracks, 1), track('d'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.tracks[3].addedByUser).toBeUndefined();
    expect(state.currentIndex).toBe(1);
  });

  it('starts playback when appended onto an empty queue', () => {
    expect(append(createQueueState([]), track('a')).currentIndex).toBe(0);
  });
});

describe('playNext', () => {
  it('inserts immediately after currentIndex, marked as user-added', () => {
    const state = playNext(createQueueState(tracks, 0), track('d'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(state.tracks[1].addedByUser).toBe(true);
    expect(state.currentIndex).toBe(0);
  });

  it('puts the newest Play next ahead of earlier user-added tracks', () => {
    let state = enqueue(createQueueState(tracks, 0), track('x'));
    state = playNext(state, track('y'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'y', 'x', 'b', 'c']);
  });

  it('inserts at the front of an empty queue', () => {
    const state = playNext(createQueueState([]), track('a'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a']);
    expect(state.currentIndex).toBe(0);
  });
});

describe('playNow', () => {
  it('inserts at the current position and makes it current, current track becomes next', () => {
    const state = playNow(createQueueState(tracks, 1), track('x'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'x', 'b', 'c']);
    // currentIndex still points at the inserted track...
    expect(getCurrentTrack(state)?.id).toBe('x');
    // ...and the previously-playing track is now immediately next.
    expect(next(state).tracks[next(state).currentIndex].id).toBe('b');
  });

  it('preserves the rest of the queue after the previous current track', () => {
    const state = playNow(createQueueState(tracks, 0), track('x'));
    expect(state.tracks.map((t) => t.id)).toEqual(['x', 'a', 'b', 'c']);
    expect(state.currentIndex).toBe(0);
  });

  it('starts a one-track queue when the queue is empty', () => {
    const state = playNow(createQueueState([]), track('x'));
    expect(state.tracks.map((t) => t.id)).toEqual(['x']);
    expect(state.currentIndex).toBe(0);
  });
});

describe('removeAt', () => {
  it('removes a track after currentIndex without shifting currentIndex', () => {
    const state = removeAt(createQueueState(tracks, 0), 2);
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(state.currentIndex).toBe(0);
  });

  it('shifts currentIndex down when removing a track before it', () => {
    const state = removeAt(createQueueState(tracks, 2), 0);
    expect(state.tracks.map((t) => t.id)).toEqual(['b', 'c']);
    expect(state.currentIndex).toBe(1);
  });

  it('clamps currentIndex when removing the currently-playing track', () => {
    const state = removeAt(createQueueState(tracks, 2), 2);
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(state.currentIndex).toBe(1);
  });

  it('goes to -1 when removing the last remaining track', () => {
    const state = removeAt(createQueueState([track('a')], 0), 0);
    expect(state.tracks).toEqual([]);
    expect(state.currentIndex).toBe(-1);
  });

  it('is a no-op for an out-of-range index', () => {
    const state = removeAt(createQueueState(tracks, 0), 10);
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('reorder', () => {
  it('moves a track and keeps currentIndex pointing at the same track', () => {
    const state = reorder(createQueueState(tracks, 1), 0, 2);
    expect(state.tracks.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(getCurrentTrack(state)?.id).toBe('b');
  });

  it('shifts currentIndex when the current track is moved by another reorder', () => {
    const state = reorder(createQueueState(tracks, 2), 0, 2);
    expect(state.tracks.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(getCurrentTrack(state)?.id).toBe('c');
  });

  it('is a no-op for equal or out-of-range indexes', () => {
    const state = reorder(createQueueState(tracks, 0), 1, 1);
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('jumpTo', () => {
  it('moves currentIndex to the given track without reordering', () => {
    const state = jumpTo(createQueueState(tracks, 0), 2);
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(getCurrentTrack(state)?.id).toBe('c');
  });

  it('can jump backwards to an already-played track', () => {
    const state = jumpTo(createQueueState(tracks, 2), 0);
    expect(getCurrentTrack(state)?.id).toBe('a');
  });

  it('is a no-op for an out-of-range index', () => {
    const start = createQueueState(tracks, 1);
    expect(jumpTo(start, 3)).toBe(start);
    expect(jumpTo(start, -1)).toBe(start);
  });

  it('is a no-op on an empty queue', () => {
    const start = createQueueState([]);
    expect(jumpTo(start, 0)).toBe(start);
  });
});

describe('setShuffle', () => {
  it('keeps the current track in place and shuffles the rest deterministically', () => {
    const random = () => 0; // Fisher-Yates with random()=0 always swaps with index 0.
    const state = setShuffle(createQueueState(tracks, 1), true, random);
    expect(state.shuffle).toBe(true);
    expect(getCurrentTrack(state)?.id).toBe('b');
    expect(state.tracks.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('restores original order when turned off', () => {
    const shuffled = setShuffle(createQueueState(tracks, 1), true, () => 0);
    const state = setShuffle(shuffled, false);
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(getCurrentTrack(state)?.id).toBe('b');
  });

  it('is a no-op when already in the requested state', () => {
    const state = createQueueState(tracks, 0);
    expect(setShuffle(state, false)).toBe(state);
  });
});

describe('restoreQueue', () => {
  it('leaves an in-range currentIndex untouched', () => {
    const state = createQueueState(tracks, 1);
    expect(restoreQueue(state)).toEqual(state);
  });

  it('snaps a currentIndex that ran off the end back to 0', () => {
    // QueueManager.next past the last track leaves currentIndex === tracks.length.
    const finished = { ...createQueueState(tracks, 2), currentIndex: tracks.length };
    expect(restoreQueue(finished).currentIndex).toBe(0);
  });

  it('snaps any other out-of-range index to 0', () => {
    expect(restoreQueue({ ...createQueueState(tracks), currentIndex: 99 }).currentIndex).toBe(0);
    expect(restoreQueue({ ...createQueueState(tracks), currentIndex: -5 }).currentIndex).toBe(0);
  });

  it('restores an empty queue verbatim (currentIndex stays -1)', () => {
    const empty = createQueueState([]);
    expect(restoreQueue(empty)).toEqual(empty);
    expect(restoreQueue(empty).currentIndex).toBe(-1);
  });

  it('preserves shuffle, repeat, and originalOrder', () => {
    const shuffled = setRepeat(setShuffle(createQueueState(tracks, 1), true, () => 0), 'all');
    const restored = restoreQueue(shuffled);
    expect(restored.shuffle).toBe(true);
    expect(restored.repeat).toBe('all');
    expect(restored.originalOrder.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('removeAt with a repeated track', () => {
  it('removes only one originalOrder entry', () => {
    const state = removeAt(createQueueState([tracks[0], tracks[1], tracks[0]], 0), 2);
    expect(state.tracks).toEqual([tracks[0], tracks[1]]);
    expect(state.originalOrder).toHaveLength(2);
    expect(state.originalOrder).toContain(tracks[0]);
  });
});

describe('insertAt', () => {
  it('undoes removeAt, keeping the current track current', () => {
    const start = createQueueState(tracks, 2);
    const restored = insertAt(removeAt(start, 0), tracks[0], 0);
    expect(restored.tracks).toEqual(start.tracks);
    expect(restored.currentIndex).toBe(2);
  });

  it('does not move the current index for a restore after it', () => {
    const start = createQueueState(tracks, 0);
    const restored = insertAt(removeAt(start, 2), tracks[2], 2);
    expect(restored.tracks).toEqual(start.tracks);
    expect(restored.currentIndex).toBe(0);
  });

  it('restores the original (shuffle-off) position', () => {
    const start = createQueueState(tracks, 0);
    const restored = insertAt(removeAt(start, 1), tracks[1], 1, 1);
    expect(restored.originalOrder).toEqual(start.originalOrder);
  });

  it('clamps an out-of-range index and revives an empty queue', () => {
    const empty = removeAt(createQueueState([tracks[0]], 0), 0);
    const restored = insertAt(empty, tracks[0], 5);
    expect(restored.tracks).toEqual([tracks[0]]);
    expect(restored.currentIndex).toBe(0);
  });
});

type State = ReturnType<typeof createQueueState>;
const ids = (state: State) => state.tracks.map((t) => t.id);
const marked = (state: State) => state.tracks.filter((t) => t.addedByUser).map((t) => t.id);

describe('source', () => {
  it('is stored by createQueueState and survives other operations', () => {
    let state = createQueueState(tracks, 0, 'Road Trip');
    expect(state.source).toBe('Road Trip');
    state = enqueue(next(setShuffle(setRepeat(state, 'all'), true, () => 0.3)), track('d'));
    expect(state.source).toBe('Road Trip');
  });

  it('is absent when none is given', () => {
    expect('source' in createQueueState(tracks)).toBe(false);
  });
});

describe('user-added marker', () => {
  it('clears when playback reaches the entry via next', () => {
    const state = next(playNext(createQueueState(tracks, 0), track('x')));
    expect(getCurrentTrack(state)?.id).toBe('x');
    expect(marked(state)).toEqual([]);
    expect(state.originalOrder.some((t) => t.addedByUser)).toBe(false);
  });

  it('clears on every entry skipped over by jumpTo', () => {
    let state = enqueue(createQueueState(tracks, 0), track('x'));
    state = enqueue(state, track('y'));
    state = jumpTo(state, 3);
    expect(getCurrentTrack(state)?.id).toBe('b');
    expect(marked(state)).toEqual([]);
  });

  it('clears when the finished queue runs off the end', () => {
    let state = enqueue(createQueueState(tracks, 2), track('x'));
    state = next(next(state));
    expect(state.currentIndex).toBe(state.tracks.length);
    expect(marked(state)).toEqual([]);
  });

  it('keeps markers on entries that are still ahead', () => {
    let state = enqueue(createQueueState(tracks, 0), track('x'));
    state = enqueue(state, track('y'));
    state = next(state);
    expect(marked(state)).toEqual(['y']);
  });

  it('clears when removing the current track makes a user-added entry current', () => {
    const state = removeAt(playNext(createQueueState(tracks, 0), track('x')), 0);
    expect(getCurrentTrack(state)?.id).toBe('x');
    expect(marked(state)).toEqual([]);
  });

  it('does not mark playNow, whose track is current immediately', () => {
    expect(marked(playNow(createQueueState(tracks, 1), track('x')))).toEqual([]);
  });

  it('Undo restores the same entry and order: removeAt then insertAt', () => {
    const before = enqueue(createQueueState(tracks, 0), track('x'));
    const removed = before.tracks[1];
    const after = removeAt(before, 1);
    const restored = insertAt(after, removed, 1, before.originalOrder.indexOf(removed));
    expect(restored.tracks).toEqual(before.tracks);
    expect(restored.originalOrder).toEqual(before.originalOrder);
    expect(marked(restored)).toEqual(['x']);
  });
});

describe('shuffle with user-added entries', () => {
  it('keeps upcoming user-added entries first, in order, and shuffles only the source tracks', () => {
    let state = createQueueState([track('a'), track('b'), track('c'), track('d'), track('e')], 0);
    state = enqueue(state, track('x'));
    state = enqueue(state, track('y'));
    const shuffled = setShuffle(state, true, () => 0);
    expect(ids(shuffled).slice(0, 3)).toEqual(['a', 'x', 'y']);
    expect(ids(shuffled).slice(3).sort()).toEqual(['b', 'c', 'd', 'e']);
  });

  it('puts user-added entries ahead of the source tracks when shuffle turns off', () => {
    let state = createQueueState([track('a'), track('b'), track('c'), track('d')], 0);
    state = setShuffle(state, true, () => 0.9);
    state = enqueue(state, track('x'));
    const off = setShuffle(state, false);
    expect(ids(off)).toEqual(['a', 'x', 'b', 'c', 'd']);
    expect(getCurrentTrack(off)?.id).toBe('a');
  });

  it('turning shuffle off mid-queue keeps the current track and plays the user-added entry next', () => {
    let state = createQueueState([track('a'), track('b'), track('c'), track('d')], 0);
    state = playNext(next(state), track('x'));
    const off = setShuffle(setShuffle(state, true, () => 0.5), false);
    expect(getCurrentTrack(off)?.id).toBe('b');
    expect(off.tracks[off.currentIndex + 1].id).toBe('x');
  });
});

describe('repeat all', () => {
  it('wraps to the first track after the last, with no markers left behind', () => {
    let state = setRepeat(enqueue(createQueueState(tracks, 2), track('x')), 'all');
    state = next(state);
    expect(getCurrentTrack(state)?.id).toBe('x');
    state = next(state);
    expect(state.currentIndex).toBe(0);
    expect(marked(state)).toEqual([]);
  });
});

describe('reorder across sections', () => {
  // a (current) | x y (user-added) | b c d (source)
  function base() {
    const state = enqueue(createQueueState([track('a'), track('b'), track('c'), track('d')], 0), track('x'));
    return enqueue(state, track('y'));
  }

  it('marks a source track dragged into the user-added block', () => {
    const state = reorder(base(), 4, 2);
    expect(ids(state)).toEqual(['a', 'x', 'c', 'y', 'b', 'd']);
    expect(marked(state)).toEqual(['x', 'c', 'y']);
  });

  it('unmarks a user-added track dragged into the source tracks', () => {
    const state = reorder(base(), 1, 4);
    expect(ids(state)).toEqual(['a', 'y', 'b', 'c', 'x', 'd']);
    expect(marked(state)).toEqual(['y']);
  });

  it('keeps a user-added track in its section when dropped on the last slot of that section', () => {
    const state = reorder(base(), 1, 2);
    expect(ids(state)).toEqual(['a', 'y', 'x', 'b', 'c', 'd']);
    expect(marked(state)).toEqual(['y', 'x']);
  });

  it('keeps a source track in its section when dropped on the first slot of that section', () => {
    const state = reorder(base(), 4, 3);
    expect(ids(state)).toEqual(['a', 'x', 'y', 'c', 'b', 'd']);
    expect(marked(state)).toEqual(['x', 'y']);
  });

  it('re-marks the entry in originalOrder too, so turning shuffle off still groups correctly', () => {
    const moved = reorder(base(), 4, 1); // c becomes user-added, first
    expect(ids(moved)).toEqual(['a', 'c', 'x', 'y', 'b', 'd']);
    expect(marked(moved)).toEqual(['c', 'x', 'y']);
    expect(
      moved.originalOrder
        .filter((t) => t.addedByUser)
        .map((t) => t.id)
        .sort(),
    ).toEqual(['c', 'x', 'y']);
    const back = setShuffle(setShuffle(moved, true, () => 0), false);
    expect(ids(back).slice(0, 4)).toEqual(['a', 'c', 'x', 'y']);
  });

  it('follows the current track when it is dragged, clearing markers it passed over', () => {
    const state = reorder(base(), 0, 2);
    expect(ids(state)).toEqual(['x', 'y', 'a', 'b', 'c', 'd']);
    expect(getCurrentTrack(state)?.id).toBe('a');
    expect(marked(state)).toEqual([]);
  });

  it('a played track dropped into the user-added block becomes user-added', () => {
    const state = enqueue(next(createQueueState([track('a'), track('b'), track('c')], 0)), track('x'));
    const out = reorder(state, 0, 1); // [a b x c] -> [b a x c]
    expect(ids(out)).toEqual(['b', 'a', 'x', 'c']);
    expect(getCurrentTrack(out)?.id).toBe('b');
    expect(marked(out)).toEqual(['a', 'x']);
  });

  it('is a no-op out of range', () => {
    const state = base();
    expect(reorder(state, 0, 99)).toBe(state);
  });
});

describe('clear', () => {
  it('empties the queue and source but keeps shuffle and repeat', () => {
    const state = clear(setRepeat(setShuffle(createQueueState(tracks, 1, 'Mix'), true), 'all'));
    expect(state.tracks).toEqual([]);
    expect(state.originalOrder).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.source).toBeUndefined();
    expect(state.shuffle).toBe(true);
    expect(state.repeat).toBe('all');
  });

  it('is fine on an already-empty queue', () => {
    expect(clear(createQueueState([])).currentIndex).toBe(-1);
  });
});
