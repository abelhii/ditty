import type { QueueState } from '@/player/QueueManager';

export type QueueRowSection = 'played' | 'nowPlaying' | 'userAdded' | 'source';

export type QueueListItem =
  | { type: 'heading'; key: string; title: string }
  | { type: 'row'; index: number; section: QueueRowSection };

/** Heading for the upcoming Tracks that came from the Playlist/album the Queue was seeded from.
 *  A Queue with no known source (restored from an older build, or seeded from a list that has no
 *  name) says "Next up". */
export function sourceHeading(source: string | undefined): string {
  return source ? `Next from ${source}` : 'Next up';
}

/**
 * Lays the Queue out as the Queue list shows it: already-played Tracks (dimmed, no heading), then
 * **Now playing**, **Next in queue** (Tracks the user added) and **Next from <source>**. Empty
 * sections get no heading. Rows keep their index into `queue.tracks`, which is also playback order —
 * QueueManager keeps upcoming user-added entries ahead of the source's Tracks, so the sections are
 * contiguous runs of that one list.
 */
export function buildQueueListItems(queue: QueueState): QueueListItem[] {
  const { tracks, currentIndex } = queue;
  const items: QueueListItem[] = [];
  let lastSection: QueueRowSection | null = null;

  tracks.forEach((track, index) => {
    const section: QueueRowSection =
      index < currentIndex
        ? 'played'
        : index === currentIndex
          ? 'nowPlaying'
          : track.addedByUser
            ? 'userAdded'
            : 'source';
    if (section !== lastSection) {
      if (section === 'nowPlaying') items.push({ type: 'heading', key: 'now-playing', title: 'Now playing' });
      if (section === 'userAdded') items.push({ type: 'heading', key: 'next-in-queue', title: 'Next in queue' });
      if (section === 'source') {
        items.push({ type: 'heading', key: 'next-from-source', title: sourceHeading(queue.source) });
      }
      lastSection = section;
    }
    items.push({ type: 'row', index, section });
  });

  return items;
}
