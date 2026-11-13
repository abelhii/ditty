import type { Track } from '@/api/types';
import { createQueueState, next } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';
import { usePlayerUiStore } from '@/player/use-player-ui-store';

jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

beforeEach(() => {
  usePlayerStore.getState().setQueue(createQueueState([track('a'), track('b')], 1));
  usePlayerUiStore.setState({ nowPlayingOpen: false, queueOpen: false, lyricsOpen: false });
});

describe('usePlayerUiStore', () => {
  it('closes the Lyrics view along with the full player', () => {
    usePlayerUiStore.getState().openNowPlaying();
    usePlayerUiStore.getState().openLyrics();
    expect(usePlayerUiStore.getState().lyricsOpen).toBe(true);

    usePlayerUiStore.getState().closeNowPlaying();
    expect(usePlayerUiStore.getState()).toMatchObject({ nowPlayingOpen: false, lyricsOpen: false });
  });

  it('closes the full player and the Queue when the Queue runs out', () => {
    usePlayerUiStore.getState().openNowPlaying();
    usePlayerUiStore.getState().openQueue();

    usePlayerStore.getState().setQueue(next(usePlayerStore.getState().queue));

    expect(usePlayerUiStore.getState()).toMatchObject({ nowPlayingOpen: false, queueOpen: false });
  });

  it('closes the full player when the Queue is emptied', () => {
    usePlayerUiStore.getState().openNowPlaying();

    usePlayerStore.getState().reset();

    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(false);
  });

  it('does not open the full player when a new track starts after the Queue ended', () => {
    usePlayerUiStore.getState().openNowPlaying();
    usePlayerStore.getState().setQueue(next(usePlayerStore.getState().queue));

    usePlayerStore.getState().setQueue(createQueueState([track('c')]));

    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(false);
  });

  it('keeps the full player open while a track is current', () => {
    usePlayerUiStore.getState().openNowPlaying();

    usePlayerStore.getState().setQueue(createQueueState([track('c'), track('d')], 1));

    expect(usePlayerUiStore.getState().nowPlayingOpen).toBe(true);
  });
});
