import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { search3, type SearchResults } from '@/api/subsonic/endpoints/search';
import { useAuthStore } from '@/auth/useAuthStore';
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

  const query = useQuery<SearchResults>({
    queryKey: queryKeys.search(term),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return search3(credentials.serverUrl, credentials, term);
    },
    enabled: isActive,
  });

  return { query, term, isActive };
}
