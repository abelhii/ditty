import { useCallback, useState } from 'react';

import { getItem, setItem } from '@/api/kvStorage';
import { addRecentSearch, removeRecentSearch } from '@/features/search/recentSearches';

/** Recent searches live in the general-purpose KV store, not the query cache — they're durable
 *  user history, not transient server responses (Build Order step 6). */
const STORAGE_KEY = 'recent-searches';

function load(): string[] {
  const raw = getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function persist(list: string[]): void {
  setItem(STORAGE_KEY, JSON.stringify(list));
}

/** KV-backed recent search strings, with add (saved on result tap, not per keystroke), remove, and
 *  clear-all. The dedup/cap/ordering rules live in the pure recentSearches module. */
export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>(load);

  const add = useCallback((term: string) => {
    setRecents((prev) => {
      const next = addRecentSearch(prev, term);
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((term: string) => {
    setRecents((prev) => {
      const next = removeRecentSearch(prev, term);
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    persist([]);
    setRecents([]);
  }, []);

  return { recents, add, remove, clear };
}
