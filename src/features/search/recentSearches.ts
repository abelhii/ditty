/** Recent-search list logic — pure so the dedup/cap/ordering rules are unit-tested independently
 *  of the KV persistence in useRecentSearches. Recent searches are query *strings* (not results),
 *  most-recent-first, deduped case-insensitively, capped (Build Order step 6). */

export const RECENT_SEARCHES_CAP = 10;

/** Adds `term` to the front, removing any case-insensitive duplicate, capped at
 *  {@link RECENT_SEARCHES_CAP}. Blank terms are ignored (list returned unchanged). */
export function addRecentSearch(list: string[], term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return list;

  const withoutDuplicate = list.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...withoutDuplicate].slice(0, RECENT_SEARCHES_CAP);
}

/** Removes `term` (case-insensitive) from the list. */
export function removeRecentSearch(list: string[], term: string): string[] {
  return list.filter((t) => t.toLowerCase() !== term.toLowerCase());
}
