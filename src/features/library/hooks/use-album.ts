import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '@/api/query-keys';
import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import { SubsonicNetworkError } from '@/api/subsonic/errors';
import { useAuthStore } from '@/auth/use-auth-store';
import { getDownloadedAlbum } from '@/features/downloads/downloads-runtime';
import { useOfflineMode } from '@/features/downloads/use-offline-store';

/** An album plus its tracks, for the album detail screen.
 *
 *  Offline (manual toggle or no connection) with nothing cached, it falls back to the album's
 *  downloaded tracks. The fallback is derived here, never written into the query cache, so it can't
 *  overwrite the full album that the persisted cache or the next online fetch provides. */
export function useAlbum(id: string) {
  const credentials = useAuthStore((state) => state.credentials);
  const offline = useOfflineMode();

  const query = useQuery({
    queryKey: queryKeys.album(id),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getAlbum(credentials.serverUrl, credentials, id);
    },
    // In Offline mode don't even try the network; the cached copy (if any) is still returned.
    enabled: credentials !== null && !offline,
  });

  const unreachable = offline || query.error instanceof SubsonicNetworkError;
  const fallback = useMemo(
    () => (query.data === undefined && unreachable ? getDownloadedAlbum(id) : null),
    [query.data, unreachable, id],
  );

  if (fallback) {
    return { ...query, data: fallback, isLoading: false, isError: false, error: null } as typeof query;
  }
  return query;
}
