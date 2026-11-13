import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import type { Track } from '@/api/types';
import { Colors } from '@/constants/theme';
import { QueueScreen } from '@/features/player/components/QueueScreen';
import { createQueueState, enqueue } from '@/player/QueueManager';
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

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

type Node = { props: { style?: unknown } };

function styleOf(node: Node): ViewStyle {
  return StyleSheet.flatten(node.props.style as ViewStyle) ?? {};
}

/** What the user sees behind a row's title: walking up from the text, the first ancestor that
 *  paints a background, or else the first earlier (underlying) sibling of an ancestor that is an
 *  absolutely positioned layer — e.g. the swipe-to-remove layer under a transparent row. */
function rowBackground(title: string): string | undefined {
  let node = screen.getByText(title).parent;
  while (node) {
    const own = styleOf(node).backgroundColor;
    if (own !== undefined) return own as string;
    const siblings = node.parent?.children ?? [];
    for (const sibling of siblings.slice(0, siblings.indexOf(node))) {
      const under = typeof sibling === 'string' ? {} : styleOf(sibling);
      if (under.position === 'absolute' && under.backgroundColor !== undefined) {
        return under.backgroundColor as string;
      }
    }
    node = node.parent;
  }
  return undefined;
}

beforeEach(() => {
  usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b'), track('c')], 1));
  usePlayerUiStore.setState({ nowPlayingOpen: true, queueOpen: true });
});

describe('QueueScreen rows', () => {
  it('paints non-current rows with the page background, not the swipe-to-remove layer', async () => {
    await render(<QueueScreen />);

    expect(rowBackground('Track a')).toBe(Colors.light.background);
    expect(rowBackground('Track c')).toBe(Colors.light.background);
  });

  it('highlights only the current row', async () => {
    await render(<QueueScreen />);

    expect(rowBackground('Track b')).toBe(Colors.light.backgroundSelected);
  });
});

describe('QueueScreen controls', () => {
  it('names the close button', async () => {
    await render(<QueueScreen />);

    expect(screen.getByRole('button', { name: 'Close Queue' })).toBeTruthy();
  });

  it('labels each drag handle with its track', async () => {
    await render(<QueueScreen />);

    expect(screen.getByLabelText('Reorder Track a')).toBeTruthy();
  });

  it('offers move up/down/remove as accessibility actions, omitting impossible moves', async () => {
    await render(<QueueScreen />);

    const names = (title: string) =>
      screen.getByText(title).parent!.parent!.props.accessibilityActions?.map((a: { name: string }) => a.name);
    expect(names('Track a')).toEqual(['moveDown', 'remove']);
    expect(names('Track b')).toEqual(['moveUp', 'moveDown', 'remove']);
    expect(names('Track c')).toEqual(['moveUp', 'remove']);
  });

  it('moves a row down through the moveDown accessibility action', async () => {
    await render(<QueueScreen />);

    await act(async () =>
      screen.getByText('Track a').parent!.parent!.props.onAccessibilityAction({ nativeEvent: { actionName: 'moveDown' } }),
    );
    expect(usePlayerStore.getState().queue.tracks.map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('reorders and removes through accessibility actions', async () => {
    await render(<QueueScreen />);
    const row = (title: string) => screen.getByText(title).parent!.parent!;

    await act(async () => row('Track b').props.onAccessibilityAction({ nativeEvent: { actionName: 'moveUp' } }));
    expect(usePlayerStore.getState().queue.tracks.map((t) => t.id)).toEqual(['b', 'a', 'c']);

    await act(async () => row('Track c').props.onAccessibilityAction({ nativeEvent: { actionName: 'remove' } }));
    expect(usePlayerStore.getState().queue.tracks.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('QueueScreen sections', () => {
  beforeEach(() => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b'), track('c')], 0, 'Road Trip'));
  });

  it('groups rows under Now playing and Next from <source>, announced as headers', async () => {
    await render(<QueueScreen />);

    expect(screen.getByRole('header', { name: 'Now playing' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Next from Road Trip' })).toBeTruthy();
    expect(screen.queryByText('Next in queue')).toBeNull();
    expect(screen.queryByText('Added by you')).toBeNull();
  });

  it('shows user-added Tracks under Next in queue with an "Added by you" caption', async () => {
    usePlayerStore.getState().setQueue(enqueue(usePlayerStore.getState().queue, track('x')));
    await render(<QueueScreen />);

    expect(screen.getByRole('header', { name: 'Next in queue' })).toBeTruthy();
    expect(screen.getAllByText('Added by you')).toHaveLength(1);
    expect(screen.getByRole('header', { name: 'Next from Road Trip' })).toBeTruthy();
  });

  it('hides Next from <source> when only user-added Tracks follow', async () => {
    usePlayerStore.getState().setQueue(enqueue(createQueueState([track('a')], 0, 'Road Trip'), track('x')));
    await render(<QueueScreen />);

    expect(screen.queryByText('Next from Road Trip')).toBeNull();
    expect(screen.getByRole('header', { name: 'Next in queue' })).toBeTruthy();
  });

  it('labels a source-less Queue (restored from an older build) "Next up"', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')], 0));
    await render(<QueueScreen />);

    expect(screen.getByRole('header', { name: 'Next up' })).toBeTruthy();
  });

  it('still removes through the accessibility action from a user-added row', async () => {
    usePlayerStore.getState().setQueue(enqueue(usePlayerStore.getState().queue, track('x')));
    await render(<QueueScreen />);

    await act(async () =>
      screen.getByText('Track x').parent!.parent!.props.onAccessibilityAction({ nativeEvent: { actionName: 'remove' } }),
    );
    expect(usePlayerStore.getState().queue.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('QueueScreen Clear queue', () => {
  it('asks first, then stops playback and empties the Queue', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')], 0, 'Road Trip'));
    usePlayerStore.getState().setDesiredPlaying(true);
    await render(<QueueScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Clear queue' }));
    expect(usePlayerStore.getState().queue.tracks).toHaveLength(2);

    await fireEvent.press(screen.getByText('Clear'));
    const { queue, desiredPlaying } = usePlayerStore.getState();
    expect(queue.tracks).toEqual([]);
    expect(desiredPlaying).toBe(false);
  });

  it('leaves the Queue alone when cancelled', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')], 0));
    await render(<QueueScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Clear queue' }));
    await fireEvent.press(screen.getByText('Cancel'));

    expect(usePlayerStore.getState().queue.tracks).toHaveLength(2);
  });

  it('is not offered when the Queue is empty', async () => {
    usePlayerStore.getState().setQueue(createQueueState([]));
    await render(<QueueScreen />);

    expect(screen.queryByRole('button', { name: 'Clear queue' })).toBeNull();
  });
});
