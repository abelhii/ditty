import { act, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import type { Track } from '@/api/types';
import { NowPlayingScreen } from '@/features/player/components/NowPlayingScreen';
import { createQueueState } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

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
// Both need React Query; neither matters to the layout under test.
jest.mock('@/components/FavouriteButton', () => ({ FavouriteButton: () => null }));
jest.mock('@/features/playlists/components/AddToPlaylistSheet', () => ({
  AddToPlaylistSheet: () => null,
}));

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

/** Whether a host element sits inside a native scroll view. */
function isInScrollView(element: { type: unknown; parent: unknown }): boolean {
  let node = element.parent as typeof element | null;
  while (node) {
    if (node.type === 'RCTScrollView') return true;
    node = node.parent as typeof element | null;
  }
  return false;
}

beforeEach(() => {
  usePlayerStore.getState().setQueue(createQueueState([track('a')]));
  usePlayerUiStore.setState({ nowPlayingOpen: true, queueOpen: false });
  usePlaybackStatusStore.setState({ status: 'paused' });
});

describe('NowPlayingScreen', () => {
  it('closes on Android back, Queue first when it is open', async () => {
    let pressBack: () => boolean | null | undefined = () => false;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      pressBack = () => handler(undefined as never);
      return { remove: () => {} };
    });
    await render(<NowPlayingScreen />);
    await act(async () => usePlayerUiStore.setState({ queueOpen: true }));

    await act(async () => pressBack());
    expect(usePlayerUiStore.getState()).toMatchObject({ nowPlayingOpen: true, queueOpen: false });

    await act(async () => pressBack());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(false);
  });

  it('puts the artwork, transport and Queue button in a scroll container, so short viewports can reach them', async () => {
    await render(<NowPlayingScreen />);

    expect(isInScrollView(screen.getByText('Track a'))).toBe(true);
    expect(isInScrollView(screen.getByText('Queue'))).toBe(true);
  });

  it('gives every control a button role and a name', async () => {
    await render(<NowPlayingScreen />);

    for (const name of ['Close player', 'Add to playlist', 'Previous track', 'Play', 'Next track', 'Open Queue']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('names play/pause after the action it will take', async () => {
    await render(<NowPlayingScreen />);
    await act(async () => usePlaybackStatusStore.setState({ status: 'playing' }));

    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
  });

  it('exposes the shuffle and repeat state', async () => {
    await render(<NowPlayingScreen />);

    expect(screen.getByRole('button', { name: 'Shuffle', selected: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Repeat off', selected: false })).toBeTruthy();

    await act(async () => {
      const { queue } = usePlayerStore.getState();
      usePlayerStore.getState().setQueue({ ...queue, shuffle: true, repeat: 'one' });
    });

    expect(screen.getByRole('button', { name: 'Shuffle', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Repeat one', selected: true })).toBeTruthy();
  });
});
