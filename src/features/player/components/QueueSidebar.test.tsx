import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Track } from '@/api/types';
import { QueueSidebar } from '@/features/player/components/QueueSidebar';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { createQueueState } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';
import { useQueueSidebarStore } from '@/player/use-queue-sidebar-store';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));
jest.mock('@/hooks/use-is-wide-layout', () => ({ useIsWideLayout: jest.fn() }));

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

beforeEach(() => {
  jest.mocked(useIsWideLayout).mockReturnValue(true);
  usePlayerStore.getState().reset();
  usePlayerUiStore.setState({ nowPlayingOpen: false, queueOpen: false });
  useQueueSidebarStore.setState({ collapsed: false });
});

describe('QueueSidebar', () => {
  it('expanded, shows the Queue sections and Clear queue', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')], 0, 'Road Trip'));
    await render(<QueueSidebar />);

    expect(screen.getByText('Now playing')).toBeOnTheScreen();
    expect(screen.getByText('Next from Road Trip')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Clear queue' })).toBeOnTheScreen();
  });

  it('collapsed, shows the rail with the Track count and the overflow', async () => {
    const tracks = ['a', 'b', 'c', 'd', 'e', 'f'].map(track);
    usePlayerStore.getState().setQueue(createQueueState(tracks, 0));
    useQueueSidebarStore.setState({ collapsed: true });
    await render(<QueueSidebar />);

    expect(screen.getByRole('button', { name: 'Expand Queue, 6 Tracks' })).toBeOnTheScreen();
    expect(screen.getByText('6')).toBeOnTheScreen();
    expect(screen.getByText('+2')).toBeOnTheScreen();
    expect(screen.queryByText('Now playing')).toBeNull();
  });

  it('collapses and expands with its buttons', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')], 0));
    await render(<QueueSidebar />);

    await fireEvent.press(screen.getByRole('button', { name: 'Collapse Queue' }));
    expect(useQueueSidebarStore.getState().collapsed).toBe(true);
    expect(screen.queryByText('Now playing')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Expand Queue, 2 Tracks' }));
    expect(useQueueSidebarStore.getState().collapsed).toBe(false);
    expect(screen.getByText('Now playing')).toBeOnTheScreen();
  });

  it('is hidden on the narrow layout', async () => {
    jest.mocked(useIsWideLayout).mockReturnValue(false);
    usePlayerStore.getState().setQueue(createQueueState([track('a')], 0));
    await render(<QueueSidebar />);

    expect(screen.queryByLabelText('Queue sidebar')).toBeNull();
  });

  it('is hidden when the Queue is empty', async () => {
    await render(<QueueSidebar />);

    expect(screen.queryByLabelText('Queue sidebar')).toBeNull();
  });

  it('is hidden while the full player is open, which shows its own Queue panel', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')], 0));
    usePlayerUiStore.setState({ nowPlayingOpen: true });
    await render(<QueueSidebar />);

    expect(screen.queryByLabelText('Queue sidebar')).toBeNull();
  });
});
