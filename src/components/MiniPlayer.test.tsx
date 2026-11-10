import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Track } from '@/api/types';
import { MiniPlayer, PlayPauseButton } from '@/components/MiniPlayer';
import * as PlaybackController from '@/player/PlaybackController';
import { createQueueState } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

describe('PlayPauseButton', () => {
  it('is a "Play" button while paused', async () => {
    usePlaybackStatusStore.setState({ status: 'paused' });
    await render(<PlayPauseButton />);

    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('is a "Pause" button while playing', async () => {
    usePlaybackStatusStore.setState({ status: 'playing' });
    await render(<PlayPauseButton />);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('is a "Retry" button when the track has halted on an error', async () => {
    usePlaybackStatusStore.setState({ status: 'error' });
    await render(<PlayPauseButton />);

    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderBar() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MiniPlayer />
    </SafeAreaProvider>,
  );
}

describe('MiniPlayer skip buttons', () => {
  const track = {
    id: 't1',
    title: 'Song',
    artist: 'Artist',
    album: 'Album',
    albumId: 'a1',
    coverArtId: 'c1',
    duration: 100,
  } as Track;

  beforeEach(() => {
    usePlayerStore.setState({ queue: createQueueState([track, { ...track, id: 't2' }], 0) });
    usePlaybackStatusStore.setState({ status: 'paused' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows Previous and Next and routes presses to the controller', async () => {
    const skipNext = jest.spyOn(PlaybackController, 'skipNext').mockImplementation(() => {});
    const skipPrevious = jest.spyOn(PlaybackController, 'skipPrevious').mockImplementation(() => {});
    await renderBar();

    await fireEvent.press(screen.getByRole('button', { name: 'Next track' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Previous track' }));

    expect(skipNext).toHaveBeenCalledTimes(1);
    expect(skipPrevious).toHaveBeenCalledTimes(1);
  });

  it('drops Previous but keeps Next on a narrow window', async () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 320, height: 640, scale: 1, fontScale: 1 });
    await renderBar();

    expect(screen.queryByRole('button', { name: 'Previous track' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Next track' })).toBeTruthy();
  });
});
