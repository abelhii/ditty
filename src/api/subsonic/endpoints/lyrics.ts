import { normalizeLyrics } from '@/api/normalize';
import { request } from '@/api/subsonic/client';
import { SubsonicApiError, SubsonicHttpError } from '@/api/subsonic/errors';
import type {
  GetLyricsBySongIdResponse,
  GetOpenSubsonicExtensionsResponse,
  SubsonicAuth,
} from '@/api/subsonic/types';
import type { Lyrics } from '@/api/types';

/**
 * The names of the OpenSubsonic extensions the server supports. A plain Subsonic server doesn't
 * know the endpoint and answers with an API error (or a 404 page), which means "none", not a
 * failure. Auth errors and unreachable servers still throw, so a transient failure isn't cached as
 * "no extensions".
 */
export async function getOpenSubsonicExtensions(serverUrl: string, auth: SubsonicAuth): Promise<string[]> {
  try {
    const { openSubsonicExtensions } = await request<GetOpenSubsonicExtensionsResponse>(
      serverUrl,
      'getOpenSubsonicExtensions',
      {},
      auth,
    );
    return (openSubsonicExtensions ?? []).map((extension) => extension.name);
  } catch (error) {
    if (error instanceof SubsonicApiError && !error.isAuthError) return [];
    if (error instanceof SubsonicHttpError && error.status === 404) return [];
    throw error;
  }
}

/** A Track's lyrics, or null when the server has none for it. Needs the `songLyrics` extension. */
export async function getLyricsBySongId(
  serverUrl: string,
  auth: SubsonicAuth,
  trackId: string,
): Promise<Lyrics | null> {
  const { lyricsList } = await request<GetLyricsBySongIdResponse>(
    serverUrl,
    'getLyricsBySongId',
    { id: trackId },
    auth,
  );
  return normalizeLyrics(lyricsList?.structuredLyrics);
}
