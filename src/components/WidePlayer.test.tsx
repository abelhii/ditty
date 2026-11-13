import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import type { Track } from '@/api/types';
import { shareMessage, WidePlayer } from '@/components/WidePlayer';
import * as PlaybackController from '@/player/PlaybackController';
import { createQueueState } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';
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
// Needs React Query; irrelevant to the layout under test.
jest.mock('@/components/FavouriteButton', () => ({ FavouriteButton: () => null }));

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

beforeEach(() => {
  jest.restoreAllMocks();
  usePlayerStore.getState().reset();
  usePlayerStore.getState().setVolume(1);
  usePlayerUiStore.setState({ nowPlayingOpen: false, queueOpen: false });
  usePlaybackStatusStore.setState({ status: 'paused', position: 0 });
  useQueueSidebarStore.setState({ collapsed: false });
});

describe('WidePlayer', () => {
  it('renders nothing when there is no current track', async () => {
    await render(<WidePlayer />);
    expect(screen.queryByText('Artist')).toBeNull();
  });

  it('renders nothing while Now Playing is open', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')]));
    usePlayerUiStore.setState({ nowPlayingOpen: true });
    await render(<WidePlayer />);
    expect(screen.queryByText('Track a')).toBeNull();
  });

  it('shows the track and the full transport', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')]));
    await render(<WidePlayer />);

    expect(screen.getByText('Track a')).toBeOnTheScreen();
    for (const name of ['Shuffle', 'Previous track', 'Play', 'Next track', 'Repeat off', 'Share', 'Volume']) {
      expect(screen.getByLabelText(name)).toBeOnTheScreen();
    }
    expect(screen.getByText('3:00')).toBeOnTheScreen();
  });

  it('routes transport presses through the PlaybackController', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')]));
    const skipNext = jest.spyOn(PlaybackController, 'skipNext').mockImplementation(() => {});
    const setShuffle = jest.spyOn(PlaybackController, 'setShuffle').mockImplementation(() => {});
    const setRepeat = jest.spyOn(PlaybackController, 'setRepeat').mockImplementation(() => {});
    await render(<WidePlayer />);

    await fireEvent.press(screen.getByLabelText('Next track'));
    await fireEvent.press(screen.getByLabelText('Shuffle'));
    await fireEvent.press(screen.getByLabelText('Repeat off'));

    expect(skipNext).toHaveBeenCalledTimes(1);
    expect(setShuffle).toHaveBeenCalledWith(true);
    expect(setRepeat).toHaveBeenCalledWith('all');
  });

  it('opens Now Playing from the track area', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')]));
    await render(<WidePlayer />);

    await fireEvent.press(screen.getByLabelText('Open now playing'));

    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(true);
  });

  it('sets the volume from a press on the slider, and reflects the store', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')]));
    await render(<WidePlayer />);
    const slider = screen.getByLabelText('Volume');

    await fireEvent(slider, 'layout', { nativeEvent: { layout: { width: 100, height: 28, x: 0, y: 0 } } });
    await fireEvent(slider, 'responderGrant', { nativeEvent: { locationX: 25 } });

    expect(usePlayerStore.getState().volume).toBe(0.25);
    await act(async () => PlaybackController.setVolume(0.8));
    expect(screen.getByLabelText('Volume').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 80 });
  });

  it('shares the track name and artist as text, never a stream link', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')]));
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await render(<WidePlayer />);

    await fireEvent.press(screen.getByLabelText('Share'));

    expect(share).toHaveBeenCalledWith({ message: 'Track a by Artist' });
    expect(shareMessage(track('a'))).not.toMatch(/https?:/);
  });

  it('toggles the Queue sidebar', async () => {
    usePlayerStore.getState().setQueue(createQueueState([track('a')]));
    await render(<WidePlayer />);

    await fireEvent.press(screen.getByRole('button', { name: 'Hide Queue' }));
    expect(useQueueSidebarStore.getState().collapsed).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Show Queue' }));
    expect(useQueueSidebarStore.getState().collapsed).toBe(false);
  });
});
