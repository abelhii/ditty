import { request } from '@/api/subsonic/client';
import { ALL_SONGS_PAGE_SIZE, getAllSongsPage } from '@/api/subsonic/endpoints/search';

jest.mock('@/api/subsonic/client', () => ({ request: jest.fn() }));

const requestMock = request as jest.Mock;
const auth = { username: 'alice', token: 'abc123', salt: 'xyz789' };
const song = { id: 's1', title: 'One', artist: 'A', album: 'B', duration: 100 };

beforeEach(() => requestMock.mockReset());

describe('getAllSongsPage', () => {
  it('browses all songs with an empty search3 query at the given offset', async () => {
    requestMock.mockResolvedValue({ searchResult3: { song: [song] } });
    const tracks = await getAllSongsPage('https://x', auth, 1000);
    expect(requestMock).toHaveBeenCalledWith(
      'https://x',
      'search3',
      { query: '', artistCount: 0, albumCount: 0, songCount: ALL_SONGS_PAGE_SIZE, songOffset: 1000 },
      auth,
    );
    expect(tracks.map((t) => t.id)).toEqual(['s1']);
  });

  it('passes a text query through to the server', async () => {
    requestMock.mockResolvedValue({ searchResult3: { song: [song] } });
    await getAllSongsPage('https://x', auth, 0, 'blue');
    expect(requestMock.mock.calls[0][2]).toMatchObject({ query: 'blue', songOffset: 0 });
  });

  it('returns an empty list when the server sends no songs', async () => {
    requestMock.mockResolvedValue({ searchResult3: {} });
    expect(await getAllSongsPage('https://x', auth, 0)).toEqual([]);
  });
});
