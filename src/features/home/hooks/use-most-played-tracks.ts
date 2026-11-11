import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

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
 * `refresh` refetches the shelf and then those albums, so new plays show up.
 */
export function useMostPlayedTracks(frequentShelf: Shelf) {
  const credentials = useAuthStore((state) => state.credentials);
  const queryClient = useQueryClient();
  const shelf = useAlbumShelf(frequentShelf);
  const [refreshing, setRefreshing] = useState(false);
  const topAlbums = (shelf.data ?? []).slice(0, MOST_PLAYED_ALBUM_COUNT);

  const tracks = useQueries({
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

  const { refetch } = shelf;
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await refetch();
      await Promise.all(
        (data ?? [])
          .slice(0, MOST_PLAYED_ALBUM_COUNT)
          .map((album) => queryClient.invalidateQueries({ queryKey: queryKeys.album(album.id) })),
      );
    } finally {
      setRefreshing(false);
    }
  }, [refetch, queryClient]);

  return { tracks, refresh, refreshing };
}
