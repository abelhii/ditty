import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getPlaylist } from '@/api/subsonic/endpoints/playlists';
import type { Playlist, Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';

/** The normalized data shape held under `playlist(id)` — a playlist plus its ordered tracks. The
 *  optimistic add/remove/update mutations patch exactly this shape. */
export type PlaylistDetail = { playlist: Playlist; tracks: Track[] };

/** A single playlist plus its ordered tracks, for the playlist detail screen. */
export function usePlaylist(id: string) {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.playlist(id),
    queryFn: (): Promise<PlaylistDetail> => {
      if (!credentials) throw new Error('Not authenticated.');
      return getPlaylist(credentials.serverUrl, credentials, id);
    },
    enabled: credentials !== null,
  });
}
