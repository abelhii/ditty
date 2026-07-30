import {
  flattenArtistIndex,
  groupArtistIndex,
  normalizeAlbum,
  normalizeArtist,
  normalizeGenre,
  normalizeTrack,
} from '@/api/normalize';
import { request } from '@/api/subsonic/client';
import type {
  GetAlbumList2Response,
  GetAlbumResponse,
  GetArtistResponse,
  GetArtistsResponse,
  GetGenresResponse,
  SubsonicAuth,
} from '@/api/subsonic/types';
import type { Album, Artist, ArtistSection, Genre, Track } from '@/api/types';

/** Subsonic's max page size for getAlbumList2 — also the trigger for "there's another page". */
export const ALBUM_LIST_PAGE_SIZE = 500;

/** The getAlbumList2 orderings the Home/discover shelves use (Build Order step 9). `byYear` also
 *  needs `fromYear`/`toYear`; the others take just `type` + `size`. */
export type AlbumListType = 'newest' | 'random' | 'recent' | 'frequent' | 'byYear';

export type AlbumListParams = {
  type: AlbumListType;
  size: number;
  offset?: number;
  /** Required (and, with `fromYear > toYear`, gives newest-first) when `type: 'byYear'`. */
  fromYear?: number;
  toYear?: number;
};

/** A single unpaginated getAlbumList2 page — the primitive behind the Home shelves. Contrast
 *  {@link getAlbumsByGenre}, which is the paginated `byGenre` variant the genre grid uses. */
export async function getAlbumList2(
  serverUrl: string,
  auth: SubsonicAuth,
  params: AlbumListParams,
): Promise<Album[]> {
  const { albumList2 } = await request<GetAlbumList2Response>(serverUrl, 'getAlbumList2', params, auth);
  return (albumList2.album ?? []).map(normalizeAlbum);
}

export async function getArtists(serverUrl: string, auth: SubsonicAuth): Promise<Artist[]> {
  const { artists } = await request<GetArtistsResponse>(serverUrl, 'getArtists', {}, auth);
  return flattenArtistIndex(artists.index ?? []);
}

/** Same underlying getArtists call as {@link getArtists}, grouped into the server's own
 *  alphabetical sections instead of flattened — for the sectioned Artists screen. */
export async function getArtistSections(serverUrl: string, auth: SubsonicAuth): Promise<ArtistSection[]> {
  const { artists } = await request<GetArtistsResponse>(serverUrl, 'getArtists', {}, auth);
  return groupArtistIndex(artists.index ?? []);
}

export async function getArtist(
  serverUrl: string,
  auth: SubsonicAuth,
  id: string,
): Promise<{ artist: Artist; albums: Album[] }> {
  const { artist } = await request<GetArtistResponse>(serverUrl, 'getArtist', { id }, auth);
  return {
    artist: normalizeArtist(artist),
    albums: (artist.album ?? []).map(normalizeAlbum),
  };
}

export async function getAlbum(
  serverUrl: string,
  auth: SubsonicAuth,
  id: string,
): Promise<{ album: Album; tracks: Track[] }> {
  const { album } = await request<GetAlbumResponse>(serverUrl, 'getAlbum', { id }, auth);
  return {
    album: normalizeAlbum(album),
    tracks: (album.song ?? []).map(normalizeTrack),
  };
}

export async function getGenres(serverUrl: string, auth: SubsonicAuth): Promise<Genre[]> {
  const { genres } = await request<GetGenresResponse>(serverUrl, 'getGenres', {}, auth);
  return (genres.genre ?? []).map(normalizeGenre);
}

/** Paginated albums-by-genre, via getAlbumList2 (Subsonic's max page size is 500) — the one real
 *  pagination surface in step 5 (Build Order step 5). */
export async function getAlbumsByGenre(
  serverUrl: string,
  auth: SubsonicAuth,
  genre: string,
  offset: number,
): Promise<Album[]> {
  const { albumList2 } = await request<GetAlbumList2Response>(
    serverUrl,
    'getAlbumList2',
    { type: 'byGenre', genre, size: ALBUM_LIST_PAGE_SIZE, offset },
    auth,
  );
  return (albumList2.album ?? []).map(normalizeAlbum);
}
