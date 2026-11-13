import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getRandomSongs } from '@/api/subsonic/endpoints/discovery';
import { useAuthStore } from '@/auth/use-auth-store';
import { rankUnheard, UNHEARD_SAMPLE_SIZE } from '@/features/home/unheard';

/** The Home "Tunes you haven't heard" list, ranked from one random-Track sample. Persists in the
 *  query cache like other Home data, so the sample may look stale offline. */
export function useUnheardTracks() {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.unheardSample(),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getRandomSongs(credentials.serverUrl, credentials, { size: UNHEARD_SAMPLE_SIZE });
    },
    select: (tracks) => rankUnheard(tracks),
    enabled: credentials !== null,
  });
}
