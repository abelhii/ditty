import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/useAuthStore';

/** An album plus its tracks, for the album detail screen. */
export function useAlbum(id: string) {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.album(id),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getAlbum(credentials.serverUrl, credentials, id);
    },
    enabled: credentials !== null,
  });
}
