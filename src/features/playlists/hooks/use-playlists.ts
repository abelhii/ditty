import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getPlaylists } from '@/api/subsonic/endpoints/playlists';
import { useAuthStore } from '@/auth/use-auth-store';

/** All of the user's playlists (metadata only). Prefetched on login; the source for My Music. */
export function usePlaylists() {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.playlists(),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getPlaylists(credentials.serverUrl, credentials);
    },
    enabled: credentials !== null,
  });
}
