import type { Track } from '@/api/types';
import { buildQueueListItems } from '@/features/player/queue-sections';
import { createQueueState, enqueue, next, playNext, removeAt } from '@/player/QueueManager';

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

const album = [track('a'), track('b'), track('c')];

/** Compact view: headings as their title, rows as `<index>:<section>`. */
function shape(queue: ReturnType<typeof createQueueState>): string[] {
  return buildQueueListItems(queue).map((item) =>
    item.type === 'heading' ? item.title : `${item.index}:${item.section}`,
  );
}

describe('buildQueueListItems', () => {
  it('is empty for an empty Queue', () => {
    expect(buildQueueListItems(createQueueState([]))).toEqual([]);
  });

  it('shows Now playing and Next from <source> for a freshly seeded Queue', () => {
    expect(shape(createQueueState(album, 0, 'Road Trip'))).toEqual([
      'Now playing',
      '0:nowPlaying',
      'Next from Road Trip',
      '1:source',
      '2:source',
    ]);
  });

  it('adds Next in queue between them once a Track is added, and hides it again once played', () => {
    let queue = enqueue(createQueueState(album, 0, 'Road Trip'), track('x'));
    expect(shape(queue)).toEqual([
      'Now playing',
      '0:nowPlaying',
      'Next in queue',
      '1:userAdded',
      'Next from Road Trip',
      '2:source',
      '3:source',
    ]);

    queue = next(queue);
    expect(shape(queue)).toEqual([
      '0:played',
      'Now playing',
      '1:nowPlaying',
      'Next from Road Trip',
      '2:source',
      '3:source',
    ]);
  });

  it('hides Next from <source> when only user-added Tracks are left', () => {
    const queue = playNext(createQueueState([track('a')], 0, 'Road Trip'), track('x'));
    expect(shape(queue)).toEqual(['Now playing', '0:nowPlaying', 'Next in queue', '1:userAdded']);
  });

  it('falls back to "Next up" when the Queue has no source (e.g. restored from an older build)', () => {
    expect(shape(createQueueState(album, 0))).toContain('Next up');
  });

  it('shows only played Tracks, with no headings, once the Queue has run off the end', () => {
    const queue = { ...createQueueState(album, 2), currentIndex: 3 };
    expect(shape(queue)).toEqual(['0:played', '1:played', '2:played']);
  });

  it('shows the lone Track as Now playing after the rest is removed', () => {
    const queue = removeAt(removeAt(createQueueState(album, 0, 'Road Trip'), 2), 1);
    expect(shape(queue)).toEqual(['Now playing', '0:nowPlaying']);
  });
});
