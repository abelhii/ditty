import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { ALBUM_LIST_PAGE_SIZE, getAlbumsByGenre } from '@/api/subsonic/endpoints/browsing';
import { useAuthStore } from '@/auth/use-auth-store';

/** Paginated albums for one genre — the one real pagination surface in the library (Build Order
 *  step 5). A page shorter than {@link ALBUM_LIST_PAGE_SIZE} means there's nothing more to fetch. */
export function useAlbumsByGenre(genre: string) {
  const credentials = useAuthStore((state) => state.credentials);

  return useInfiniteQuery({
    queryKey: queryKeys.albumsByGenre(genre),
    queryFn: ({ pageParam }) => {
      if (!credentials) throw new Error('Not authenticated.');
      return getAlbumsByGenre(credentials.serverUrl, credentials, genre, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ALBUM_LIST_PAGE_SIZE ? allPages.length * ALBUM_LIST_PAGE_SIZE : undefined,
    enabled: credentials !== null,
  });
}
