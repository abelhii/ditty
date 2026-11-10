import { act, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import type { Track } from '@/api/types';
import { NowPlayingScreen } from '@/features/player/components/NowPlayingScreen';
import { QueueScreen } from '@/features/player/components/QueueScreen';
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
// Both need React Query; neither matters here.
jest.mock('@/components/FavouriteButton', () => ({ FavouriteButton: () => null }));
jest.mock('@/features/playlists/components/AddToPlaylistSheet', () => ({
  AddToPlaylistSheet: () => null,
}));

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

type HostNode = { type: unknown; props: Record<string, unknown>; parent: HostNode | null };

/** The modal host that contains an element, if any. On web, react-native-web's Modal calls
 *  `onRequestClose` on Escape and traps Tab focus inside it. */
function modalAround(element: HostNode): HostNode | null {
  let node = element.parent;
  while (node) {
    if (node.type === 'Modal') return node;
    node = node.parent;
  }
  return null;
}

let mockWide = false;
jest.mock('@/hooks/use-is-wide-layout', () => ({ useIsWideLayout: () => mockWide }));

beforeEach(() => {
  mockWide = false;
  jest.useFakeTimers();
  usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')]));
  usePlayerUiStore.setState({ nowPlayingOpen: true, queueOpen: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('player overlays on web', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
  });

  it('closes the Queue on Escape', async () => {
    await render(<QueueScreen />);

    const modal = modalAround(screen.getByText('Queue') as unknown as HostNode);
    expect(modal).not.toBeNull();
    await act(() => (modal!.props.onRequestClose as () => void)());

    expect(usePlayerUiStore.getState().queueOpen).toBe(false);
    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(true);
  });

  it('closes the full player on Escape', async () => {
    usePlayerUiStore.setState({ queueOpen: false });
    await render(<NowPlayingScreen />);

    const modal = modalAround(screen.getByText('Track a') as unknown as HostNode);
    expect(modal).not.toBeNull();
    await act(async () => {
      (modal!.props.onRequestClose as () => void)();
      jest.runAllTimers();
    });

    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(false);
  });
});

describe('player overlays on native', () => {
  it('stay plain in-tree views', async () => {
    await render(<QueueScreen />);

    expect(modalAround(screen.getByText('Queue') as unknown as HostNode)).toBeNull();
  });
});

describe('player overlays on the wide layout', () => {
  const g = globalThis as unknown as { document?: unknown };
  let keydown: ((event: { key: string }) => void) | undefined;

  beforeEach(() => {
    mockWide = true;
    keydown = undefined;
    g.document = {
      addEventListener: (_: string, handler: typeof keydown) => (keydown = handler),
      removeEventListener: () => {},
    };
  });
  afterAll(() => delete g.document);

  it('shows the Queue as a panel in the full player instead of a separate overlay', async () => {
    usePlayerUiStore.setState({ queueOpen: false });
    await render(<NowPlayingScreen />);

    expect(screen.getByText('Queue')).toBeTruthy();
    expect(screen.getByText('Track b')).toBeTruthy();
    expect(screen.queryByLabelText('Open Queue')).toBeNull();
  });

  it('does not render the Queue overlay', async () => {
    await render(<QueueScreen />);
    expect(screen.queryByText('Queue')).toBeNull();
  });

  it('closes the full player on Escape without a Modal', async () => {
    usePlayerUiStore.setState({ queueOpen: false });
    await render(<NowPlayingScreen />);
    expect(modalAround(screen.getAllByText('Track a')[0] as unknown as HostNode)).toBeNull();

    await act(async () => {
      keydown?.({ key: 'Escape' });
      jest.runAllTimers();
    });

    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(false);
  });
});
