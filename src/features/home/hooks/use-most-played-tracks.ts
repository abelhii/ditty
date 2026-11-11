import { useQueries } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/use-auth-store';
import { useAlbumShelf } from '@/features/home/hooks/use-album-shelf';
import { MOST_PLAYED_ALBUM_COUNT, rankMostPlayed } from '@/features/home/most-played';
import type { Shelf } from '@/features/home/shelves';

/**
 * The most played Tracks, ranked by each Track's own play count. Subsonic has no such endpoint, so
 * this takes the top albums from the Frequently played shelf and ranks their Tracks. A hot Track on a
 * low-play album can be missed. Albums go through the same cached `getAlbum` query as album detail.
 */
export function useMostPlayedTracks(frequentShelf: Shelf) {
  const credentials = useAuthStore((state) => state.credentials);
  const { data: albums } = useAlbumShelf(frequentShelf);
  const topAlbums = (albums ?? []).slice(0, MOST_PLAYED_ALBUM_COUNT);

  return useQueries({
    queries: topAlbums.map((album) => ({
      queryKey: queryKeys.album(album.id),
      queryFn: () => {
        if (!credentials) throw new Error('Not authenticated.');
        return getAlbum(credentials.serverUrl, credentials, album.id);
      },
      enabled: credentials !== null,
    })),
    combine: (results) => rankMostPlayed(results.flatMap((result) => result.data?.tracks ?? [])),
  });
}
