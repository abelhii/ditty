import { normalizeAlbum, normalizeArtist, normalizeTrack } from '@/api/normalize';
import { request } from '@/api/subsonic/client';
import type { GetSearch3Response, SubsonicAuth } from '@/api/subsonic/types';
import type { Album, Artist, Track } from '@/api/types';

/**
 * Fixed result counts for search (Build Order step 6): all rendered in one combined sectioned
 * scroll, no pagination. `search3` takes only a text `query` plus these per-entity counts — it has
 * no genre/year/type filter, so attribute filtering isn't part of search (see step 6 / step 9).
 */
export const SEARCH_ARTIST_COUNT = 20;
export const SEARCH_ALBUM_COUNT = 20;
export const SEARCH_SONG_COUNT = 40;

export type SearchResults = {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
};

/** Full-text search across artists, albums, and songs in a single call. */
export async function search3(
  serverUrl: string,
  auth: SubsonicAuth,
  query: string,
): Promise<SearchResults> {
  const { searchResult3 } = await request<GetSearch3Response>(
    serverUrl,
    'search3',
    {
      query,
      artistCount: SEARCH_ARTIST_COUNT,
      albumCount: SEARCH_ALBUM_COUNT,
      songCount: SEARCH_SONG_COUNT,
    },
    auth,
  );

  return {
    artists: (searchResult3.artist ?? []).map(normalizeArtist),
    albums: (searchResult3.album ?? []).map(normalizeAlbum),
    tracks: (searchResult3.song ?? []).map(normalizeTrack),
  };
}

/** Songs per `search3` page when browsing every song. 500 is the page size sync clients use against
 *  Navidrome; the server accepts it and a full page means there may be another. */
export const ALL_SONGS_PAGE_SIZE = 500;

/**
 * One page of every song on the server. Subsonic has no "all songs" endpoint, so this uses the
 * `search3` empty-query browse-all convention (Navidrome supports it with `songOffset` paging). A
 * server that doesn't support it returns no songs, which the screen shows as empty. Order is the
 * server's, not guaranteed — callers sort.
 */
export async function getAllSongsPage(
  serverUrl: string,
  auth: SubsonicAuth,
  offset: number,
): Promise<Track[]> {
  const { searchResult3 } = await request<GetSearch3Response>(
    serverUrl,
    'search3',
    {
      query: '',
      artistCount: 0,
      albumCount: 0,
      songCount: ALL_SONGS_PAGE_SIZE,
      songOffset: offset,
    },
    auth,
  );
  return (searchResult3.song ?? []).map(normalizeTrack);
}
