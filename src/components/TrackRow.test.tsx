import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { Track } from '@/api/types';
import { TrackRow } from '@/components/TrackRow';
import { Colors } from '@/constants/theme';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';
import { createQueueState } from '@/player/QueueManager';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

const track: Track = { id: 't1', title: 'Song', artist: 'Artist', album: 'Album', duration: 125, starred: false };

function colorOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style).color;
}

function rowBackground() {
  const root = screen.toJSON() as unknown as { props: { style: StyleProp<ViewStyle> } };
  return (StyleSheet.flatten(root.props.style) as ViewStyle).backgroundColor;
}

function setCurrentTrack(current: Track | null) {
  usePlayerStore.setState({ queue: createQueueState(current ? [current] : []) });
}

beforeEach(() => {
  setCurrentTrack(null);
  usePlaybackStatusStore.setState({ status: 'idle' });
});

async function renderRow(props: { isPlaying?: boolean; position?: number }) {
  setCurrentTrack(props.isPlaying ? track : null);
  await render(<TrackRow track={track} onPress={() => {}} onOverflowPress={() => {}} {...props} />);
}

describe('TrackRow', () => {
  it('marks the playing track title in the accent colour', async () => {
    await renderRow({ isPlaying: true });
    expect(colorOf('Song')).toBe(Colors.light.accent);
  });

  it('replaces the position with the now-playing indicator', async () => {
    await renderRow({ isPlaying: true, position: 3 });
    expect(screen.queryByText('3')).toBeNull();
  });

  it('tints the background of the playing row only', async () => {
    await renderRow({ isPlaying: true });
    expect(rowBackground()).toBe(Colors.light.rowPlaying);
    await screen.unmount();

    await renderRow({ isPlaying: false });
    expect(rowBackground()).toBeUndefined();
  });

  it('tints the row more strongly while pressed than when playing', async () => {
    await renderRow({ isPlaying: true });
    const row = screen.toJSON() as { props: Record<string, unknown> };
    await act(async () => {
      (row.props.onResponderGrant as (e: unknown) => void)({ nativeEvent: { touches: [] }, persist() {}, currentTarget: 1 });
    });
    expect(rowBackground()).toBe(Colors.light.rowPressed);
  });

  it('renders the animated equaliser while the current track is playing', async () => {
    usePlaybackStatusStore.setState({ status: 'playing' });
    await renderRow({ isPlaying: true, position: 3 });
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('Song')).toBeTruthy();
  });

  it('keeps the position visible when the track is not current', async () => {
    await renderRow({ isPlaying: false, position: 3 });
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('leaves a track that is not playing in the normal colours', async () => {
    await renderRow({ isPlaying: false, position: 3 });
    expect(colorOf('Song')).toBe(Colors.light.text);
    expect(colorOf('3')).toBe(Colors.light.textSecondary);
  });

  it('names the overflow button after the track', async () => {
    await renderRow({});
    expect(screen.getByRole('button', { name: 'More options for Song' })).toBeTruthy();
  });
});
