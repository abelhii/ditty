import { render, screen } from '@testing-library/react-native';

import type { Track } from '@/api/types';
import { NowPlayingScreen } from '@/features/player/components/NowPlayingScreen';
import { createQueueState } from '@/player/QueueManager';
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
});

describe('NowPlayingScreen', () => {
  it('puts the artwork, transport and Queue button in a scroll container, so short viewports can reach them', async () => {
    await render(<NowPlayingScreen />);

    expect(isInScrollView(screen.getByText('Track a'))).toBe(true);
    expect(isInScrollView(screen.getByText('Queue'))).toBe(true);
  });
});
