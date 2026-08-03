import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getArtistSections } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/use-auth-store';

/** Sectioned (A-Z) artist list for the Artists screen. Reads credentials internally — safe since
 *  library screens only ever render behind the authenticated gate in `_layout.tsx`. */
export function useArtistSections() {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.artistSections(),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getArtistSections(credentials.serverUrl, credentials);
    },
    enabled: credentials !== null,
  });
}
