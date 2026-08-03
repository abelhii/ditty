import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/api/query-keys';
import { search3, type SearchResults } from '@/api/subsonic/endpoints/search';
import { useAuthStore } from '@/auth/use-auth-store';
import { filterArtistsWithContent } from '@/features/search/filter-artists-with-content';
import { filterSongsByTitle } from '@/features/search/filter-songs-by-title';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

/** Fire a search only once the box holds a real term — a single character matches almost
 *  everything and isn't worth a round-trip. */
export const SEARCH_MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

/**
 * Debounced live search over `search3` (Build Order step 6). Debounces the raw input by 300ms and
 * only queries once the settled term is ≥ {@link SEARCH_MIN_CHARS} characters. Returns the query
 * result, the settled search `term`, and `isActive` (whether a search is in play) so the screen
 * can show Recent Searches instead of results when the box is empty/sub-threshold.
 */
export function useSearch(input: string) {
  const credentials = useAuthStore((state) => state.credentials);
  const term = useDebouncedValue(input.trim(), DEBOUNCE_MS);
  const isActive = credentials !== null && term.length >= SEARCH_MIN_CHARS;

  // Post-filter the raw search3 results: scope Songs to title matches (search3 also matches a
  // song's artist/album, which would list an artist's whole catalogue) and drop content-less
  // artist entries that are dead ends when tapped. See filterSongsByTitle / filterArtistsWithContent.
  const selectFiltered = useCallback(
    (data: SearchResults): SearchResults => ({
      ...data,
      artists: filterArtistsWithContent(data.artists),
      tracks: filterSongsByTitle(data.tracks, term),
    }),
    [term],
  );

  const query = useQuery<SearchResults, Error, SearchResults>({
    queryKey: queryKeys.search(term),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return search3(credentials.serverUrl, credentials, term);
    },
    enabled: isActive,
    select: selectFiltered,
  });

  return { query, term, isActive };
}
