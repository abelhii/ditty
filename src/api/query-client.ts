import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryCache, QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';

import { getItem, removeItem, setItem } from '@/api/kv-storage';
import { mutationErrorNotice } from '@/api/mutation-error-notice';
import { SubsonicApiError } from '@/api/subsonic/errors';
import { useAuthStore } from '@/auth/use-auth-store';
import { showNotice } from '@/components/use-notice-store';

const FIVE_MINUTES = 5 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** A mid-session token rejection (code 40/41) — the only error class that triggers Re-authentication.
 *  Definitionally a *server response*, never "offline", so it keys off the class, not connectivity. */
function isAuthError(error: unknown): boolean {
  return error instanceof SubsonicApiError && error.isAuthError;
}

/**
 * The single place the app reacts to auth rejection and surfaces failed mutations (ADR 0007) — so
 * `request()` stays a pure API function with no auth/navigation concerns. Every query and mutation
 * error flows through here.
 */
const queryCache = new QueryCache({
  onError: (error) => {
    if (isAuthError(error)) useAuthStore.getState().sessionExpired();
  },
});

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // Re-authentication owns the auth case; suppress the Notice so the two don't stack. Rollback
    // still runs in each hook's own onError regardless.
    if (isAuthError(error)) {
      useAuthStore.getState().sessionExpired();
      return;
    }
    const action = (mutation.meta?.action as string | undefined) ?? 'save that change';
    showNotice(mutationErrorNotice(error, action));
  },
});

/**
 * TanStack Query's cache is the local library cache — there's no separate database mirror.
 * See docs/adr/0002-no-local-library-mirror.md. `staleTime`/`gcTime`/`maxAge` are sensible
 * defaults for fairly static library metadata, not hard requirements — safe to retune later.
 */
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
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
