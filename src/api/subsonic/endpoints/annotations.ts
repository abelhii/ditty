import { normalizeAlbum, normalizeArtist, normalizeTrack } from '@/api/normalize';
import { request } from '@/api/subsonic/client';
import type { GetStarred2Response, SubsonicAuth } from '@/api/subsonic/types';
import type { Album, Artist, Track } from '@/api/types';

/** The three things that can be favourited. Each maps to a different star/unstar param name
 *  (`id` for songs, `albumId` for albums, `artistId` for artists) — the Subsonic API keys them
 *  separately even though Navidrome would also accept a bare `id`. */
export type StarKind = 'song' | 'album' | 'artist';

const STAR_PARAM: Record<StarKind, 'id' | 'albumId' | 'artistId'> = {
  song: 'id',
  album: 'albumId',
  artist: 'artistId',
};

export async function star(
  serverUrl: string,
  auth: SubsonicAuth,
  id: string,
  kind: StarKind,
): Promise<void> {
  await request(serverUrl, 'star', { [STAR_PARAM[kind]]: id }, auth);
}

export async function unstar(
  serverUrl: string,
  auth: SubsonicAuth,
  id: string,
  kind: StarKind,
): Promise<void> {
  await request(serverUrl, 'unstar', { [STAR_PARAM[kind]]: id }, auth);
}

/** The user's Favourites, split into its three collections (getStarred2 — the ID3 variant).
 *  Prefetched on login so the Favourites screen feels instant. */
export async function getStarred(
  serverUrl: string,
  auth: SubsonicAuth,
): Promise<{ artists: Artist[]; albums: Album[]; tracks: Track[] }> {
  const { starred2 } = await request<GetStarred2Response>(serverUrl, 'getStarred2', {}, auth);
  return {
    artists: (starred2.artist ?? []).map(normalizeArtist),
    albums: (starred2.album ?? []).map(normalizeAlbum),
    tracks: (starred2.song ?? []).map(normalizeTrack),
  };
}
