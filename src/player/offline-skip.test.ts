import type { Track } from '@/api/types';
import { stepToPlayable } from '@/player/offline-skip';
import * as QueueManager from '@/player/QueueManager';

function track(id: string): Track {
  return { id, title: id, artist: 'A', album: 'B', duration: 1, starred: false };
}

const tracks = ['a', 'b', 'c', 'd'].map(track);
const identity = (s: QueueManager.QueueState) => s;
const only = (...ids: string[]) => (t: Track) => ids.includes(t.id);

describe('stepToPlayable', () => {
  it('stays on a playable start track', () => {
    const q = QueueManager.createQueueState(tracks, 0);
    expect(stepToPlayable(q, identity, only('a')).currentIndex).toBe(0);
  });

  it('cannot leave an unplayable track with a step that does not move', () => {
    const q = QueueManager.createQueueState(tracks, 0);
    expect(stepToPlayable(q, identity, only('c')).currentIndex).toBe(0);
  });

  it('moves forward from an unplayable start track when stepping with next', () => {
    const q = QueueManager.createQueueState(tracks, 0);
    expect(stepToPlayable(q, QueueManager.next, only('c')).currentIndex).toBe(2);
  });

  it('skips unplayable tracks going forward', () => {
    const q = QueueManager.createQueueState(tracks, 0);
    expect(stepToPlayable(q, QueueManager.next, only('a', 'd')).currentIndex).toBe(3);
  });

  it('skips unplayable tracks going back', () => {
    const q = QueueManager.createQueueState(tracks, 3);
    expect(stepToPlayable(q, QueueManager.previous, only('a', 'd')).currentIndex).toBe(0);
  });

  it('runs off the end when nothing ahead is playable (repeat off)', () => {
    const q = QueueManager.createQueueState(tracks, 0);
    const result = stepToPlayable(q, QueueManager.next, only('a'));
    expect(QueueManager.getCurrentTrack(result)).toBeUndefined();
  });

  it('terminates when nothing is playable under repeat all', () => {
    const q = QueueManager.setRepeat(QueueManager.createQueueState(tracks, 0), 'all');
    expect(() => stepToPlayable(q, QueueManager.next, () => false)).not.toThrow();
  });

  it('stops on repeat-one instead of spinning', () => {
    const q = QueueManager.setRepeat(QueueManager.createQueueState(tracks, 0), 'one');
    expect(stepToPlayable(q, QueueManager.next, only('d')).currentIndex).toBe(0);
  });

  it('stops going back at the start', () => {
    const q = QueueManager.createQueueState(tracks, 1);
    expect(stepToPlayable(q, QueueManager.previous, only('d')).currentIndex).toBe(0);
  });

  it('handles an empty queue', () => {
    const q = QueueManager.createQueueState([], 0);
    expect(stepToPlayable(q, QueueManager.next, () => true).tracks).toEqual([]);
  });
});
