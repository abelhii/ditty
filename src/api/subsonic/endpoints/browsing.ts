import {
  flattenArtistIndex,
  normalizeAlbum,
  normalizeArtist,
  normalizeGenre,
  normalizePlaylist,
  normalizeTrack,
} from '@/api/normalize';
import { request } from '@/api/subsonic/client';
import type {
  GetAlbumResponse,
  GetArtistResponse,
  GetArtistsResponse,
  GetGenresResponse,
  GetPlaylistsResponse,
  GetStarred2Response,
  SubsonicAuth,
} from '@/api/subsonic/types';
import type { Album, Artist, Genre, Playlist, Track } from '@/api/types';

export async function getArtists(serverUrl: string, auth: SubsonicAuth): Promise<Artist[]> {
  const { artists } = await request<GetArtistsResponse>(serverUrl, 'getArtists', {}, auth);
  return flattenArtistIndex(artists.index ?? []);
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

export async function getPlaylists(serverUrl: string, auth: SubsonicAuth): Promise<Playlist[]> {
  const { playlists } = await request<GetPlaylistsResponse>(serverUrl, 'getPlaylists', {}, auth);
  return (playlists.playlist ?? []).map(normalizePlaylist);
}

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
