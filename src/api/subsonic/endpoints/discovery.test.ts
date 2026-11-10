import { getRandomSongs, getSimilarSongs2 } from '@/api/subsonic/endpoints/discovery';
import { request } from '@/api/subsonic/client';

jest.mock('@/api/subsonic/client', () => ({ request: jest.fn() }));

const requestMock = request as jest.Mock;
const auth = { username: 'alice', token: 'abc123', salt: 'xyz789' };
const song = { id: 's1', title: 'One', artist: 'A', album: 'B', duration: 100, genre: 'Rock' };

beforeEach(() => requestMock.mockReset());

describe('getRandomSongs', () => {
  it('passes size and genre and normalizes the songs', async () => {
    requestMock.mockResolvedValue({ randomSongs: { song: [song] } });
    const tracks = await getRandomSongs('https://x', auth, { size: 5, genre: 'Rock' });
    expect(requestMock).toHaveBeenCalledWith('https://x', 'getRandomSongs', { size: 5, genre: 'Rock' }, auth);
    expect(tracks.map((t) => t.id)).toEqual(['s1']);
    expect(tracks[0].genre).toBe('Rock');
  });

  it('returns an empty list when the server sends no songs', async () => {
    requestMock.mockResolvedValue({ randomSongs: {} });
    expect(await getRandomSongs('https://x', auth, { size: 5 })).toEqual([]);
  });
});

describe('getSimilarSongs2', () => {
  it('sends the artist id and count', async () => {
    requestMock.mockResolvedValue({ similarSongs2: { song: [song] } });
    const tracks = await getSimilarSongs2('https://x', auth, 'ar1', 10);
    expect(requestMock).toHaveBeenCalledWith('https://x', 'getSimilarSongs2', { id: 'ar1', count: 10 }, auth);
    expect(tracks).toHaveLength(1);
  });

  it('returns an empty list when Last.fm is not configured', async () => {
    requestMock.mockResolvedValue({ similarSongs2: {} });
    expect(await getSimilarSongs2('https://x', auth, 'ar1', 10)).toEqual([]);
  });
});
