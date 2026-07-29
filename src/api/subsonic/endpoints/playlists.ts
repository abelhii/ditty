import { normalizePlaylist, normalizeTrack } from '@/api/normalize';
import { request } from '@/api/subsonic/client';
import type {
  CreatePlaylistResponse,
  GetPlaylistResponse,
  GetPlaylistsResponse,
  SubsonicAuth,
} from '@/api/subsonic/types';
import type { Playlist, Track } from '@/api/types';

/** All of the user's playlists (name + metadata only, no tracks) — prefetched on login. */
export async function getPlaylists(serverUrl: string, auth: SubsonicAuth): Promise<Playlist[]> {
  const { playlists } = await request<GetPlaylistsResponse>(serverUrl, 'getPlaylists', {}, auth);
  return (playlists.playlist ?? []).map(normalizePlaylist);
}

/** A single playlist plus its ordered tracks, for the playlist detail screen. */
export async function getPlaylist(
  serverUrl: string,
  auth: SubsonicAuth,
  id: string,
): Promise<{ playlist: Playlist; tracks: Track[] }> {
  const { playlist } = await request<GetPlaylistResponse>(serverUrl, 'getPlaylist', { id }, auth);
  return {
    playlist: normalizePlaylist(playlist),
    tracks: (playlist.entry ?? []).map(normalizeTrack),
  };
}

/** Creates a new, empty playlist and returns it with its server-assigned id. Tracks are added
 *  afterwards via {@link updatePlaylist} (`songIdToAdd`) — see the add-to-playlist flow. */
export async function createPlaylist(
  serverUrl: string,
  auth: SubsonicAuth,
  name: string,
): Promise<Playlist> {
  const { playlist } = await request<CreatePlaylistResponse>(
    serverUrl,
    'createPlaylist',
    { name },
    auth,
  );
  return normalizePlaylist(playlist);
}

/** The mutating fields of updatePlaylist. `songIndexToRemove` is a *positional* index into the
 *  playlist's current entry list — a sharp edge for optimistic updates (see the playlist hooks). */
export type UpdatePlaylistChanges = {
  name?: string;
  isPublic?: boolean;
  songIdToAdd?: string;
  songIndexToRemove?: number;
};

/** Renames / retitles / re-scopes a playlist, or adds/removes a single track. Returns nothing. */
export async function updatePlaylist(
  serverUrl: string,
  auth: SubsonicAuth,
  playlistId: string,
  changes: UpdatePlaylistChanges,
): Promise<void> {
  await request(
    serverUrl,
    'updatePlaylist',
    {
      playlistId,
      name: changes.name,
      public: changes.isPublic,
      songIdToAdd: changes.songIdToAdd,
      songIndexToRemove: changes.songIndexToRemove,
    },
    auth,
  );
}

export async function deletePlaylist(serverUrl: string, auth: SubsonicAuth, id: string): Promise<void> {
  await request(serverUrl, 'deletePlaylist', { id }, auth);
}
