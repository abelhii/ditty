import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { getAlbumList2 } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/useAuthStore';
import type { Shelf } from '@/features/home/shelves';

/** One Home/discover shelf's albums, via a single getAlbumList2 call (Build Order step 9). Reads
 *  credentials internally like the library hooks — the Home screen only renders behind the
 *  authenticated gate. The shelf persists in the query cache like other library data, so a
 *  previously-seen Home degrades to cached shelves offline (the `random` set may look stale). */
export function useAlbumShelf(shelf: Shelf) {
  const credentials = useAuthStore((state) => state.credentials);

  return useQuery({
    queryKey: queryKeys.albumShelf(shelf.id),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getAlbumList2(credentials.serverUrl, credentials, shelf.params);
    },
    enabled: credentials !== null,
  });
}
