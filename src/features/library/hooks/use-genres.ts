import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getGenres } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/use-auth-store';

/** Flat genre list, for the Artists screen's Genres toggle. */
export function useGenres() {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.genres(),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getGenres(credentials.serverUrl, credentials);
    },
    enabled: credentials !== null,
  });
}
