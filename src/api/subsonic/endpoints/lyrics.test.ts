import { request } from '@/api/subsonic/client';
import { getLyricsBySongId, getOpenSubsonicExtensions } from '@/api/subsonic/endpoints/lyrics';
import { SubsonicApiError, SubsonicHttpError, SubsonicNetworkError } from '@/api/subsonic/errors';

jest.mock('@/api/subsonic/client', () => ({ request: jest.fn() }));

const requestMock = request as jest.Mock;
const auth = { username: 'alice', token: 'abc123', salt: 'xyz789' };

beforeEach(() => requestMock.mockReset());

describe('getOpenSubsonicExtensions', () => {
  it('returns the extension names', async () => {
    requestMock.mockResolvedValue({
      openSubsonicExtensions: [
        { name: 'transcodeOffset', versions: [1] },
        { name: 'songLyrics', versions: [1] },
      ],
    });
    expect(await getOpenSubsonicExtensions('https://x', auth)).toEqual(['transcodeOffset', 'songLyrics']);
    expect(requestMock).toHaveBeenCalledWith('https://x', 'getOpenSubsonicExtensions', {}, auth);
  });

  it('returns an empty list when the server sends none', async () => {
    requestMock.mockResolvedValue({});
    expect(await getOpenSubsonicExtensions('https://x', auth)).toEqual([]);
  });

  it('treats a plain Subsonic server (API error or 404) as having no extensions', async () => {
    requestMock.mockRejectedValueOnce(new SubsonicApiError(70));
    expect(await getOpenSubsonicExtensions('https://x', auth)).toEqual([]);
    requestMock.mockRejectedValueOnce(new SubsonicHttpError(404));
    expect(await getOpenSubsonicExtensions('https://x', auth)).toEqual([]);
  });

  it('still throws auth errors, 5xx and network failures', async () => {
    requestMock.mockRejectedValueOnce(new SubsonicApiError(40));
    await expect(getOpenSubsonicExtensions('https://x', auth)).rejects.toBeInstanceOf(SubsonicApiError);
    requestMock.mockRejectedValueOnce(new SubsonicHttpError(502));
    await expect(getOpenSubsonicExtensions('https://x', auth)).rejects.toBeInstanceOf(SubsonicHttpError);
    requestMock.mockRejectedValueOnce(new SubsonicNetworkError(new Error('x')));
    await expect(getOpenSubsonicExtensions('https://x', auth)).rejects.toBeInstanceOf(SubsonicNetworkError);
  });
});

describe('getLyricsBySongId', () => {
  it('sends the song id and normalizes synced lyrics', async () => {
    requestMock.mockResolvedValue({
      lyricsList: {
        structuredLyrics: [
          { lang: 'eng', offset: -100, synced: true, line: [{ start: 0, value: 'One' }, { start: 2000, value: 'Two' }] },
        ],
      },
    });
    const lyrics = await getLyricsBySongId('https://x', auth, 's1');
    expect(requestMock).toHaveBeenCalledWith('https://x', 'getLyricsBySongId', { id: 's1' }, auth);
    expect(lyrics).toEqual({
      synced: true,
      offsetMs: -100,
      lines: [
        { text: 'One', startMs: 0 },
        { text: 'Two', startMs: 2000 },
      ],
    });
  });

  it('returns null for an empty or missing lyrics list', async () => {
    requestMock.mockResolvedValueOnce({ lyricsList: {} });
    expect(await getLyricsBySongId('https://x', auth, 's1')).toBeNull();
    requestMock.mockResolvedValueOnce({ lyricsList: { structuredLyrics: [] } });
    expect(await getLyricsBySongId('https://x', auth, 's1')).toBeNull();
    requestMock.mockResolvedValueOnce({});
    expect(await getLyricsBySongId('https://x', auth, 's1')).toBeNull();
  });
});
