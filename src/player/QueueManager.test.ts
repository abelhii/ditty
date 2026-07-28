import type { Track } from '@/api/types';
import {
  createQueueState,
  enqueue,
  getCurrentTrack,
  next,
  playNext,
  playNow,
  previous,
  removeAt,
  reorder,
  setRepeat,
  setShuffle,
} from '@/player/QueueManager';

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180 };
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
  it('appends to the end without moving currentIndex', () => {
    const state = enqueue(createQueueState(tracks, 1), track('d'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.currentIndex).toBe(1);
  });

  it('starts playback when enqueued onto an empty queue', () => {
    const state = enqueue(createQueueState([]), track('a'));
    expect(state.currentIndex).toBe(0);
  });
});

describe('playNext', () => {
  it('inserts immediately after currentIndex', () => {
    const state = playNext(createQueueState(tracks, 0), track('d'));
    expect(state.tracks.map((t) => t.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(state.currentIndex).toBe(0);
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
