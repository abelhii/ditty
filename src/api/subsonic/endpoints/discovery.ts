import { normalizeTrack } from '@/api/normalize';
import { request } from '@/api/subsonic/client';
import type {
  GetRandomSongsResponse,
  GetSimilarSongs2Response,
  SubsonicAuth,
} from '@/api/subsonic/types';
import type { Track } from '@/api/types';

/** Random Tracks, optionally restricted to one genre — Auto-DJ's primary source. Works on every
 *  Navidrome; `genre` is a single exact genre name (the endpoint takes no list). */
export async function getRandomSongs(
  serverUrl: string,
  auth: SubsonicAuth,
  params: { size: number; genre?: string },
): Promise<Track[]> {
  const { randomSongs } = await request<GetRandomSongsResponse>(
    serverUrl,
    'getRandomSongs',
    params,
    auth,
  );
  return (randomSongs.song ?? []).map(normalizeTrack);
}

/** Tracks similar to an artist (`artistId` is an ID3 artist id). Navidrome only answers this with
 *  its Last.fm integration enabled; without it the list comes back empty, which callers treat as
 *  "no similar tracks", not as an error. */
export async function getSimilarSongs2(
  serverUrl: string,
  auth: SubsonicAuth,
  artistId: string,
  count: number,
): Promise<Track[]> {
  const { similarSongs2 } = await request<GetSimilarSongs2Response>(
    serverUrl,
    'getSimilarSongs2',
    { id: artistId, count },
    auth,
  );
  return (similarSongs2.song ?? []).map(normalizeTrack);
}
