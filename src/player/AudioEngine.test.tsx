import { act, render } from '@testing-library/react-native';

import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { AudioEngine } from '@/player/AudioEngine';
import * as PlaybackController from '@/player/PlaybackController';
import { usePlayerStore } from '@/player/use-player-store';

jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));
let mockRecord: unknown = null;
jest.mock('@/features/downloads/local-source-deps', () => ({
  localSourceDeps: () => ({
    lookup: () => mockRecord,
    fileExists: () => true,
    onMissingFile: () => {},
  }),
}));
jest.mock('@/utils/network', () => ({ isOffline: () => Promise.resolve(false) }));

const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(),
  loop: false,
  volume: 1,
};
let mockStatus: Record<string, unknown>;
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
  useAudioPlayer: () => mockPlayer,
  // A fresh object per call, like expo-audio, so the status effect re-runs on every render.
  useAudioPlayerStatus: () => ({ ...mockStatus }),
}));

function track(id: string): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred: false };
}

const playingStatus = {
  isLoaded: true,
  isBuffering: false,
  playing: true,
  currentTime: 10,
  didJustFinish: false,
  error: undefined,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRecord = null;
  mockStatus = { ...playingStatus };
  useAuthStore.setState({
    credentials: { serverUrl: 'http://example.test', username: 'u', salt: 's', token: 't' },
  });
});

describe('AudioEngine track end', () => {
  it('advances exactly one track when the finished status is still stale after the skip', async () => {
    PlaybackController.play([track('a'), track('b'), track('c'), track('d')], 0);
    const view = await render(<AudioEngine />);

    // Track a ends. The player keeps reporting didJustFinish until the new source loads.
    mockStatus = { ...playingStatus, playing: false, didJustFinish: true };
    await act(async () => view.rerender(<AudioEngine />));
    await act(async () => view.rerender(<AudioEngine />));
    await act(async () => view.rerender(<AudioEngine />));

    expect(usePlayerStore.getState().queue.currentIndex).toBe(1);
  });

  it('advances again when the next track finishes for real', async () => {
    PlaybackController.play([track('a'), track('b'), track('c')], 0);
    const view = await render(<AudioEngine />);

    mockStatus = { ...playingStatus, playing: false, didJustFinish: true };
    await act(async () => view.rerender(<AudioEngine />));
    mockStatus = { ...playingStatus };
    await act(async () => view.rerender(<AudioEngine />));
    mockStatus = { ...playingStatus, playing: false, didJustFinish: true };
    await act(async () => view.rerender(<AudioEngine />));

    expect(usePlayerStore.getState().queue.currentIndex).toBe(2);
  });
});

describe('AudioEngine track source', () => {
  it('streams a track that is not downloaded', async () => {
    PlaybackController.play([track('a')], 0);
    await render(<AudioEngine />);
    expect(mockPlayer.replace).toHaveBeenCalledWith({
      uri: expect.stringContaining('/rest/stream.view'),
    });
  });

  it('plays a downloaded track from its local file', async () => {
    mockRecord = {
      track: track('a'),
      filePath: 'file:///d/a.flac',
      coverPath: null,
      sizeBytes: 1,
      state: 'complete',
    };
    PlaybackController.play([track('a')], 0);
    await render(<AudioEngine />);
    expect(mockPlayer.replace).toHaveBeenCalledWith({ uri: 'file:///d/a.flac' });
  });
});

describe('AudioEngine volume', () => {
  it('applies the store volume to the player, and follows changes', async () => {
    mockPlayer.volume = 1;
    await render(<AudioEngine />);

    await act(async () => PlaybackController.setVolume(0.3));
    expect(mockPlayer.volume).toBe(0.3);
  });
});
