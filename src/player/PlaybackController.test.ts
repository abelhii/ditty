import type { Track } from '@/api/types';
import { getRandomSongs, getSimilarSongs2 } from '@/api/subsonic/endpoints/discovery';
import { useAuthStore } from '@/auth/use-auth-store';
import { showNotice } from '@/components/use-notice-store';
import * as PlaybackController from '@/player/PlaybackController';
import { createQueueState, setRepeat } from '@/player/QueueManager';
import { useAutoDjSettingsStore } from '@/player/use-auto-dj-settings-store';
import { useAutoDjStore } from '@/player/use-auto-dj-store';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';
import { useOfflineStore } from '@/features/downloads/use-offline-store';
import { usePlayerStore } from '@/player/use-player-store';

jest.mock('@/api/subsonic/endpoints/discovery');
jest.mock('@/components/use-notice-store', () => ({ showNotice: jest.fn() }));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

const randomMock = getRandomSongs as jest.Mock;
const similarMock = getSimilarSongs2 as jest.Mock;

function track(id: string, extra: Partial<Track> = {}): Track {
  return { id, title: id, artist: 'A', album: 'B', duration: 1, starred: false, ...extra };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  useAutoDjStore.getState().reset();
  useAutoDjSettingsStore.getState().reset();
  usePlayerStore.getState().reset();
  useOfflineStore.setState({ manual: false, deviceOffline: false });
  useDownloadsStore.setState({ items: {}, downloadedIds: {} });
  useAuthStore.setState({
    credentials: { serverUrl: 'https://x', username: 'u', token: 't', salt: 's' },
  } as never);
  similarMock.mockResolvedValue([]);
  randomMock.mockResolvedValue([]);
});

describe('Auto-DJ refill', () => {
  it('appends same-genre tracks when the queue runs low, skipping tracks already queued', async () => {
    randomMock.mockImplementation(async (_u, _a, p: { genre?: string }) =>
      p.genre ? [track('a'), track('g1'), track('g2')] : [track('r1')],
    );
    PlaybackController.play([track('a', { genre: 'Rock' })]);
    PlaybackController.setAutoDj(true);
    await flush();

    expect(randomMock).toHaveBeenCalledWith('https://x', expect.anything(), expect.objectContaining({ genre: 'Rock' }));
    const ids = usePlayerStore.getState().queue.tracks.map((t) => t.id);
    expect(ids[0]).toBe('a');
    expect(ids.filter((id) => id === 'a')).toHaveLength(1);
    expect(ids).toEqual(expect.arrayContaining(['g1', 'g2']));
    expect(usePlayerStore.getState().queue.currentIndex).toBe(0);
  });

  it('does nothing while Auto-DJ is off or repeat is on', async () => {
    randomMock.mockResolvedValue([track('x')]);
    PlaybackController.play([track('a')]);
    await flush();
    expect(randomMock).not.toHaveBeenCalled();

    usePlayerStore.setState({ queue: setRepeat(createQueueState([track('a')]), 'all') });
    PlaybackController.setAutoDj(true);
    await flush();
    expect(randomMock).not.toHaveBeenCalled();
  });

  it('resumes playback on the first new track when the queue had already run off the end', async () => {
    randomMock.mockResolvedValue([track('n1'), track('n2')]);
    PlaybackController.play([track('a')]);
    useAutoDjStore.getState().setEnabled(true);
    usePlayerStore.setState({ queue: { ...usePlayerStore.getState().queue, currentIndex: 1 }, desiredPlaying: false });
    PlaybackController.setAutoDj(true);
    await flush();

    const { queue, desiredPlaying } = usePlayerStore.getState();
    expect(queue.currentIndex).toBe(1);
    expect(queue.tracks[1].id).toBe('n1');
    expect(desiredPlaying).toBe(true);
  });

  it('keeps the queue intact and shows one Notice when every source fails', async () => {
    randomMock.mockRejectedValue(new Error('offline'));
    PlaybackController.play([track('a', { genre: 'Rock' })]);
    PlaybackController.setAutoDj(true);
    await flush();
    PlaybackController.setAutoDj(false);
    PlaybackController.setAutoDj(true);
    await flush();

    expect(usePlayerStore.getState().queue.tracks).toHaveLength(1);
    expect(showNotice).toHaveBeenCalledTimes(1);
  });

  it('uses the any-genre pool only when the seed has no genre', async () => {
    randomMock.mockResolvedValue([track('r1')]);
    PlaybackController.play([track('a')]);
    PlaybackController.setAutoDj(true);
    await flush();

    expect(randomMock).toHaveBeenCalledTimes(1);
    expect(randomMock.mock.calls[0][2]).not.toHaveProperty('genre');
    expect(usePlayerStore.getState().queue.tracks.map((t) => t.id)).toEqual(['a', 'r1']);
  });

  it('source "random" fetches only the any-genre pool, even for a seed with a genre', async () => {
    useAutoDjSettingsStore.getState().setSource('random');
    randomMock.mockResolvedValue([track('r1')]);
    PlaybackController.play([track('a', { genre: 'Rock', artistId: 'ar1' })]);
    PlaybackController.setAutoDj(true);
    await flush();

    expect(randomMock).toHaveBeenCalledTimes(1);
    expect(randomMock.mock.calls[0][2]).not.toHaveProperty('genre');
    expect(similarMock).not.toHaveBeenCalled();
  });

  it('source "genre" skips similar songs, "mixed" asks for them', async () => {
    randomMock.mockResolvedValue([track('r1')]);
    useAutoDjSettingsStore.getState().setSource('genre');
    PlaybackController.play([track('a', { genre: 'Rock', artistId: 'ar1' })]);
    PlaybackController.setAutoDj(true);
    await flush();
    expect(similarMock).not.toHaveBeenCalled();

    useAutoDjSettingsStore.getState().setSource('mixed');
    PlaybackController.play([track('b', { genre: 'Rock', artistId: 'ar1' })]);
    PlaybackController.setAutoDj(true);
    await flush();
    expect(similarMock).toHaveBeenCalledWith('https://x', expect.anything(), 'ar1', expect.any(Number));
  });

  it('randomness 0 keeps picks on the genre pool', async () => {
    useAutoDjSettingsStore.getState().setRandomness(0);
    randomMock.mockImplementation(async (_u, _a, p: { genre?: string }) =>
      p.genre ? [track('g1'), track('g2')] : [track('r1'), track('r2')],
    );
    PlaybackController.play([track('a', { genre: 'Rock' })]);
    PlaybackController.setAutoDj(true);
    await flush();

    expect(usePlayerStore.getState().queue.tracks.slice(1, 3).map((t) => t.id)).toEqual(['g1', 'g2']);
  });
});

describe('setVolume', () => {
  it('stores the volume', () => {
    PlaybackController.setVolume(0.4);
    expect(usePlayerStore.getState().volume).toBe(0.4);
  });

  it('clamps to 0-1', () => {
    PlaybackController.setVolume(1.5);
    expect(usePlayerStore.getState().volume).toBe(1);
    PlaybackController.setVolume(-0.2);
    expect(usePlayerStore.getState().volume).toBe(0);
  });
});

describe('Offline mode playback', () => {
  const four = () => ['a', 'b', 'c', 'd'].map((id) => track(id));

  it('does not skip anything when Offline mode is off', () => {
    PlaybackController.play(four(), 0);
    PlaybackController.skipNext();
    expect(usePlayerStore.getState().queue.currentIndex).toBe(1);
  });

  it('skips tracks that are not downloaded on next', () => {
    useOfflineStore.setState({ manual: true });
    useDownloadsStore.setState({ downloadedIds: { a: true, d: true } });
    PlaybackController.play(four(), 0);
    PlaybackController.skipNext();
    expect(usePlayerStore.getState().queue.currentIndex).toBe(3);
  });

  it('starts at the next downloaded track when the requested one is not', () => {
    useOfflineStore.setState({ deviceOffline: true });
    useDownloadsStore.setState({ downloadedIds: { c: true } });
    PlaybackController.play(four(), 0);
    expect(usePlayerStore.getState().queue.currentIndex).toBe(2);
    expect(usePlayerStore.getState().desiredPlaying).toBe(true);
  });

  it('skips undownloaded tracks on previous', () => {
    useOfflineStore.setState({ manual: true });
    useDownloadsStore.setState({ downloadedIds: { a: true, d: true } });
    PlaybackController.play(four(), 3);
    PlaybackController.skipPrevious();
    expect(usePlayerStore.getState().queue.currentIndex).toBe(0);
  });

  it('finishes the queue when nothing after the current track is downloaded', () => {
    useOfflineStore.setState({ manual: true });
    useDownloadsStore.setState({ downloadedIds: { a: true } });
    PlaybackController.play(four(), 0);
    PlaybackController.skipNext();
    expect(usePlayerStore.getState().desiredPlaying).toBe(false);
  });
});

describe('removeFromQueue', () => {
  it('shows an Undo notice that restores the track at its previous index', () => {
    PlaybackController.play([track('a'), track('b'), track('c')], 0);
    PlaybackController.removeFromQueue(1);
    expect(usePlayerStore.getState().queue.tracks.map((t) => t.id)).toEqual(['a', 'c']);
    expect(showNotice).toHaveBeenCalledWith('Removed from Queue', { label: 'Undo', onPress: expect.any(Function) });

    (showNotice as jest.Mock).mock.calls[0][1].onPress();
    expect(usePlayerStore.getState().queue.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  describe('Undo staleness', () => {
    const ids = () => usePlayerStore.getState().queue.tracks.map((t) => t.id);
    const undo = () => (showNotice as jest.Mock).mock.calls[0][1].onPress();
    beforeEach(() => PlaybackController.play([track('a'), track('b'), track('c'), track('d')], 0));

    it('does nothing after the Queue was replaced', () => {
      PlaybackController.removeFromQueue(1);
      PlaybackController.play([track('x'), track('y')], 0);
      undo();
      expect(ids()).toEqual(['x', 'y']);
    });

    it('does nothing after a reorder', () => {
      PlaybackController.removeFromQueue(1);
      PlaybackController.reorderQueue(0, 2);
      undo();
      expect(ids()).toEqual(['c', 'd', 'a']);
    });

    it('does nothing after a second remove', () => {
      PlaybackController.removeFromQueue(1);
      PlaybackController.removeFromQueue(0);
      undo();
      expect(ids()).toEqual(['c', 'd']);
    });

    it('still works after the current track merely advances', () => {
      PlaybackController.removeFromQueue(2);
      PlaybackController.skipNext();
      undo();
      expect(ids()).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  it('shows no notice for an out-of-range index', () => {
    PlaybackController.play([track('a')], 0);
    PlaybackController.removeFromQueue(5);
    expect(showNotice).not.toHaveBeenCalled();
  });
});
