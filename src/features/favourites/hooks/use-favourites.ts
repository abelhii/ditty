import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getStarred } from '@/api/subsonic/endpoints/annotations';
import { useAuthStore } from '@/auth/use-auth-store';

/** The user's Favourites — starred songs, albums, and artists (getStarred2). Prefetched on login,
 *  so the Favourites screen is instant; the cache is also what useStar/useUnstar patch optimistically. */
export function useFavourites() {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.starred(),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getStarred(credentials.serverUrl, credentials);
    },
    enabled: credentials !== null,
  });
}
