export type ShelfResult = {
  isLoading: boolean;
  /** TanStack `isPaused`: wants to fetch but is waiting for a connection. */
  isPaused?: boolean;
  error: unknown;
  data: readonly unknown[] | undefined;
};

export type HomeStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'failed'; error: unknown }
  | { kind: 'paused' }
  | { kind: 'empty' };

/**
 * What Home as a whole should say about its Shelves. A single failed or empty Shelf stays silent
 * (Home degrades to the Shelves that have content); only when none has anything to show does Home
 * need a message — `failed` (with the first error, for a Retry) if any Shelf errored, `empty` if
 * they all simply came back empty (a brand-new Library). A Shelf that is paused with no data (no
 * connection, empty cache) is not empty: it is `paused`.
 */
export function homeStatus(results: ShelfResult[]): HomeStatus {
  if (results.some((r) => r.isLoading)) return { kind: 'loading' };
  if (results.some((r) => (r.data?.length ?? 0) > 0)) return { kind: 'ready' };
  const failed = results.find((r) => r.error != null);
  if (failed) return { kind: 'failed', error: failed.error };
  if (results.some((r) => r.isPaused)) return { kind: 'paused' };
  return { kind: 'empty' };
}
