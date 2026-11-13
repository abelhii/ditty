import { QueueRailWidth, QueueSidebarWidth } from '@/constants/theme';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';
import { useQueueSidebarStore } from '@/player/use-queue-sidebar-store';

/** Width the Queue sidebar takes from the right of the window: 0 when it is not shown (narrow
 *  layout, empty Queue, or the full player open, which has its own Queue panel), else the rail or
 *  the full sidebar. The floating player reads it to stay clear of the sidebar. */
export function useQueueSidebarWidth(): number {
  const wide = useIsWideLayout();
  const hasTracks = usePlayerStore((state) => state.queue.tracks.length > 0);
  const nowPlayingOpen = usePlayerUiStore((state) => state.nowPlayingOpen);
  const collapsed = useQueueSidebarStore((state) => state.collapsed);

  if (!wide || !hasTracks || nowPlayingOpen) return 0;
  return collapsed ? QueueRailWidth : QueueSidebarWidth;
}
