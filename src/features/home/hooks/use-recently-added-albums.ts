import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getAlbumList2 } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/use-auth-store';
import { RECENTLY_ADDED_PAGE_SIZE } from '@/features/home/recently-added';

/** Albums by date added (`getAlbumList2` type `newest`), paged by offset for the Recently added
 *  screen. A page shorter than the page size means the server has no more. */
export function useRecentlyAddedAlbums() {
  const credentials = useAuthStore((state) => state.credentials);

  return useInfiniteQuery({
    queryKey: queryKeys.recentlyAddedAlbums(),
    queryFn: ({ pageParam }) => {
      if (!credentials) throw new Error('Not authenticated.');
      return getAlbumList2(credentials.serverUrl, credentials, {
        type: 'newest',
        size: RECENTLY_ADDED_PAGE_SIZE,
        offset: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === RECENTLY_ADDED_PAGE_SIZE ? allPages.length * RECENTLY_ADDED_PAGE_SIZE : undefined,
    enabled: credentials !== null,
  });
}
