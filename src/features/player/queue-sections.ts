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

/** Places the list items on a fixed grid. `placed` carries each item's top; `tops[i]` is where
 *  `queue.tracks[i]` is drawn — what drag targeting measures against, so it is indexed by *queue*
 *  index, not list-item index (headings add items but no Tracks). */
export function layoutQueueItems(queue: QueueState, rowHeight: number, headingHeight: number) {
  const tops: number[] = [];
  let y = 0;
  const placed = buildQueueListItems(queue).map((item) => {
    const top = y;
    if (item.type === 'row') tops[item.index] = top;
    y += item.type === 'heading' ? headingHeight : rowHeight;
    return { item, top };
  });
  return { placed, tops, contentHeight: y };
}

/** The queue index whose slot is nearest to where the row at `index` now sits after being dragged
 *  `dy` from its own slot. The result is a queue index, ready for `QueueManager.reorder`. */
export function dropTarget(tops: number[], index: number, dy: number): number {
  const dragged = tops[index] + dy;
  let target = index;
  for (let i = 0; i < tops.length; i++) {
    if (Math.abs(tops[i] - dragged) < Math.abs(tops[target] - dragged)) target = i;
  }
  return target;
}

/** How far a non-dragged row shifts to open a gap at the drag target: into the slot of its
 *  neighbour, so a heading between the two is accounted for. */
export function shiftFor(tops: number[], index: number, from: number | null, to: number): number {
  if (from === null || index === from) return 0;
  if (from < to && index > from && index <= to) return tops[index - 1] - tops[index];
  if (from > to && index < from && index >= to) return tops[index + 1] - tops[index];
  return 0;
}
