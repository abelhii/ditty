import { queryClient } from '@/api/query-client';
import { queryKeys } from '@/api/query-keys';
import { getStarred } from '@/api/subsonic/endpoints/annotations';
import { getAlbumList2, getArtistSections, getArtists, getGenres } from '@/api/subsonic/endpoints/browsing';
import { getPlaylists } from '@/api/subsonic/endpoints/playlists';
import type { SubsonicAuth } from '@/api/subsonic/types';
import { homeShelves } from '@/features/home/shelves';

/** Prefetches the top-level "Your Library" lists right after login, so those screens feel
 *  instant. Everything else (an artist's albums, an album's tracks) is fetched lazily on
 *  navigation — see docs/adr/0002-no-local-library-mirror.md. */
export function prefetchLibrary(serverUrl: string, auth: SubsonicAuth): void {
  queryClient.prefetchQuery({ queryKey: queryKeys.artists(), queryFn: () => getArtists(serverUrl, auth) });
  queryClient.prefetchQuery({
    queryKey: queryKeys.artistSections(),
    queryFn: () => getArtistSections(serverUrl, auth),
  });
  queryClient.prefetchQuery({ queryKey: queryKeys.genres(), queryFn: () => getGenres(serverUrl, auth) });
  queryClient.prefetchQuery({ queryKey: queryKeys.playlists(), queryFn: () => getPlaylists(serverUrl, auth) });
  queryClient.prefetchQuery({ queryKey: queryKeys.starred(), queryFn: () => getStarred(serverUrl, auth) });

  // The Home tab is the first screen after login — prefetch its discover shelves too (Build Order
  // step 9). Cheap single getAlbumList2 calls each.
  for (const shelf of homeShelves(new Date().getFullYear())) {
    queryClient.prefetchQuery({
      queryKey: queryKeys.albumShelf(shelf.id),
      queryFn: () => getAlbumList2(serverUrl, auth, shelf.params),
    });
  }
}
