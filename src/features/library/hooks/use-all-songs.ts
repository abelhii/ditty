import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { ALL_SONGS_PAGE_SIZE, getAllSongsPage } from '@/api/subsonic/endpoints/search';
import { useAuthStore } from '@/auth/use-auth-store';

/** Every song on the server, one page at a time. A page shorter than {@link ALL_SONGS_PAGE_SIZE}
 *  means there is nothing more to fetch. */
export function useAllSongs() {
  const credentials = useAuthStore((state) => state.credentials);

  return useInfiniteQuery({
    queryKey: queryKeys.allSongs(),
    queryFn: ({ pageParam }) => {
      if (!credentials) throw new Error('Not authenticated.');
      return getAllSongsPage(credentials.serverUrl, credentials, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ALL_SONGS_PAGE_SIZE ? allPages.length * ALL_SONGS_PAGE_SIZE : undefined,
    enabled: credentials !== null,
  });
}
