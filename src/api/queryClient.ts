import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';

import { getItem, removeItem, setItem } from '@/api/kvStorage';

const FIVE_MINUTES = 5 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * TanStack Query's cache is the local library cache — there's no separate database mirror.
 * See docs/adr/0002-no-local-library-mirror.md. `staleTime`/`gcTime`/`maxAge` are sensible
 * defaults for fairly static library metadata, not hard requirements — safe to retune later.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MINUTES,
      gcTime: SEVEN_DAYS,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: { getItem, setItem, removeItem },
  key: 'music-player-query-cache',
});

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister,
  maxAge: SEVEN_DAYS,
  dehydrateOptions: {
    // Search results are live "ask the server now" queries — persisting them would bloat the KV
    // cache with transient entries and surface confusing stale offline results. Keep everything
    // else on the default (successful queries persist). See Build Order step 6.
    shouldDehydrateQuery: (query) =>
      query.queryKey[0] !== 'search' && defaultShouldDehydrateQuery(query),
  },
};
