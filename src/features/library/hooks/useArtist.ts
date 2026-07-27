import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { getArtist } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/useAuthStore';

/** An artist plus its albums, for the artist detail screen. */
export function useArtist(id: string) {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.artist(id),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getArtist(credentials.serverUrl, credentials, id);
    },
    enabled: credentials !== null,
  });
}
