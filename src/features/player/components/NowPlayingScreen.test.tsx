import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler, Share } from 'react-native';

import type { Track } from '@/api/types';
import { useLyricsSupported } from '@/features/player/hooks/use-lyrics';
import { NowPlayingScreen } from '@/features/player/components/NowPlayingScreen';
import { useNoticeStore } from '@/components/use-notice-store';
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

jest.mock('@/features/player/hooks/use-lyrics', () => ({ useLyricsSupported: jest.fn() }));

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
  jest.mocked(useLyricsSupported).mockReturnValue(false);
  usePlayerUiStore.setState({ lyricsOpen: false });
  usePlayerStore.getState().setQueue(createQueueState([track('a')]));
  usePlayerUiStore.setState({ nowPlayingOpen: true, queueOpen: false });
  usePlaybackStatusStore.setState({ status: 'paused' });
});

describe('NowPlayingScreen', () => {
  it('hides the Lyrics pill when the server does not support lyrics', async () => {
    await render(<NowPlayingScreen />);

    expect(screen.queryByRole('button', { name: 'Lyrics' })).toBeNull();
  });

  it('shows a Lyrics pill that opens the Lyrics view when the server supports lyrics', async () => {
    jest.mocked(useLyricsSupported).mockReturnValue(true);
    await render(<NowPlayingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Lyrics' }));
    expect(usePlayerUiStore.getState().lyricsOpen).toBe(true);
  });

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

  it('puts the artwork, transport and Up next card in a scroll container, so short viewports can reach them', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')]));
    await render(<NowPlayingScreen />);

    expect(isInScrollView(screen.getByText('Track a'))).toBe(true);
    expect(isInScrollView(screen.getByText('Up next · 2 in queue'))).toBe(true);
  });

  it('gives every control a button role and a name', async () => {
    await render(<NowPlayingScreen />);

    for (const name of ['Close player', 'Add to playlist', 'Previous track', 'Play', 'Next track', 'Share']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('shows "Playing from <source>" for a Queue seeded from a list', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')], 0, 'Late Night Drive'));
    await render(<NowPlayingScreen />);

    expect(screen.getByText('Playing from Late Night Drive')).toBeTruthy();
  });

  it('omits the "Playing from" text when the Queue has no source', async () => {
    await render(<NowPlayingScreen />);

    expect(screen.queryByText(/^Playing from/)).toBeNull();
  });

  it('shows the Up next card with the next Track and the Queue length, and opens the Queue on press', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b'), track('c')]));
    await render(<NowPlayingScreen />);

    expect(screen.getByText('Up next · 3 in queue')).toBeTruthy();
    expect(screen.getByText('Track b')).toBeTruthy();
    expect(screen.queryByText('Track c')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Up next: Track b by Artist, 3 in queue' }));
    expect(usePlayerUiStore.getState().queueOpen).toBe(true);
  });

  it('shows the Up next card for the Track after the current one, not the first', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b'), track('c')], 1));
    await render(<NowPlayingScreen />);

    expect(screen.getByText('Track c')).toBeTruthy();
  });

  it('keeps a Queue card on the last Track, with no next Track, that still opens the Queue', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')], 1));
    await render(<NowPlayingScreen />);

    expect(screen.queryByText(/^Up next/)).toBeNull();
    expect(screen.getByText('Queue · 2 in queue')).toBeTruthy();
    expect(screen.getByText('Nothing up next')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Open Queue, nothing up next, 2 in queue' }));
    expect(usePlayerUiStore.getState().queueOpen).toBe(true);
  });

  it('keeps the Queue card for a 1-Track Queue', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')]));
    await render(<NowPlayingScreen />);

    expect(screen.getByText('Queue · 1 in queue')).toBeTruthy();
  });

  it('shares the Track name and artist, and shows a Notice when sharing is unavailable', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await render(<NowPlayingScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({ message: 'Track a by Artist' });

    share.mockRejectedValue(new Error('unavailable'));
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    await act(async () => {});
    expect(useNoticeStore.getState().current?.message).toBe("Sharing isn't available here.");
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
