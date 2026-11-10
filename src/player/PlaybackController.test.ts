import type { Track } from '@/api/types';
import { getRandomSongs, getSimilarSongs2 } from '@/api/subsonic/endpoints/discovery';
import { useAuthStore } from '@/auth/use-auth-store';
import { showNotice } from '@/components/use-notice-store';
import * as PlaybackController from '@/player/PlaybackController';
import { createQueueState, setRepeat } from '@/player/QueueManager';
import { useAutoDjStore } from '@/player/use-auto-dj-store';
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
  usePlayerStore.getState().reset();
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
});
