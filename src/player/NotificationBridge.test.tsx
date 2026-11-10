import { render } from '@testing-library/react-native';
import { act } from 'react';

import type { Track } from '@/api/types';
import { NotificationBridge } from '@/player/NotificationBridge';
import * as PlaybackController from '@/player/PlaybackController';
import { createQueueState } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';

type Listener = (event: { command: string; data?: { position?: number }; timestamp: number }) => void;

const mockListeners: Listener[] = [];
const mockMediaControl = {
  enableMediaControls: jest.fn(() => Promise.resolve()),
  disableMediaControls: jest.fn(() => Promise.resolve()),
  updateMetadata: jest.fn(() => Promise.resolve()),
  updatePlaybackState: jest.fn(() => Promise.resolve()),
  addListener: jest.fn((listener: Listener) => {
    mockListeners.push(listener);
    return () => mockListeners.splice(mockListeners.indexOf(listener), 1);
  }),
};

jest.mock('expo-media-control', () => ({
  // A getter: the factory runs at import time, before `mockMediaControl` is initialised.
  get MediaControl() {
    return mockMediaControl;
  },
  Command: {
    PLAY: 'play',
    PAUSE: 'pause',
    NEXT_TRACK: 'nextTrack',
    PREVIOUS_TRACK: 'previousTrack',
    SEEK: 'seek',
  },
  PlaybackState: { NONE: 0, STOPPED: 1, PLAYING: 2, PAUSED: 3, BUFFERING: 4, ERROR: 5 },
}));
jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

const track = {
  id: 't1',
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  albumId: 'a1',
  coverArtId: 'c1',
  duration: 100,
} as Track;

function press(command: string, data?: { position?: number }) {
  act(() => mockListeners.forEach((listener) => listener({ command, data, timestamp: 0 })));
}

describe('NotificationBridge (native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners.length = 0;
    usePlayerStore.setState({ queue: createQueueState([track], 0) });
    usePlaybackStatusStore.setState({ status: 'paused', position: 0 });
  });

  afterEach(() => jest.restoreAllMocks());

  it('enables next and previous alongside play/pause/seek', async () => {
    await render(<NotificationBridge />);

    const options = (mockMediaControl.enableMediaControls.mock.calls as unknown[][])[0][0] as {
      capabilities: string[];
    };
    expect(options.capabilities).toEqual(
      expect.arrayContaining(['play', 'pause', 'nextTrack', 'previousTrack', 'seek']),
    );
  });

  it('forwards each OS button into PlaybackController', async () => {
    const skipNext = jest.spyOn(PlaybackController, 'skipNext').mockImplementation(() => {});
    const skipPrevious = jest.spyOn(PlaybackController, 'skipPrevious').mockImplementation(() => {});
    const resume = jest.spyOn(PlaybackController, 'resume').mockImplementation(() => {});
    const pause = jest.spyOn(PlaybackController, 'pause').mockImplementation(() => {});
    const seekTo = jest.spyOn(PlaybackController, 'seekTo').mockImplementation(() => {});
    await render(<NotificationBridge />);

    press('nextTrack');
    press('previousTrack');
    press('play');
    press('pause');
    press('seek', { position: 42 });
    press('seek');

    expect(skipNext).toHaveBeenCalledTimes(1);
    expect(skipPrevious).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(seekTo).toHaveBeenCalledTimes(1);
    expect(seekTo).toHaveBeenCalledWith(42);
  });

  it('reflects playback status and disables the controls on unmount', async () => {
    const view = await render(<NotificationBridge />);
    expect(mockMediaControl.updatePlaybackState).toHaveBeenLastCalledWith(3, 0);

    act(() => usePlaybackStatusStore.setState({ status: 'playing' }));
    expect(mockMediaControl.updatePlaybackState).toHaveBeenLastCalledWith(2, 0);

    await view.unmount();
    expect(mockMediaControl.disableMediaControls).toHaveBeenCalled();
    expect(mockListeners).toHaveLength(0);
  });

  it('reports no playback when the queue is empty', async () => {
    usePlayerStore.setState({ queue: createQueueState([], 0) });
    await render(<NotificationBridge />);

    expect(mockMediaControl.updatePlaybackState).toHaveBeenLastCalledWith(0, 0);
    expect(mockMediaControl.updateMetadata).not.toHaveBeenCalled();
  });
});
