import { SubsonicNetworkError } from '@/api/subsonic/errors';

/**
 * The wording for a failed-mutation `Notice`, fired centrally from the global `MutationCache.onError`
 * (ADR 0007). Keyed off the error *class*, consistent with `QueryState`: a `SubsonicNetworkError`
 * (offline / unreachable) reads as "not saved", anything else as a generic "couldn't {action}".
 * `action` comes from the per-mutation `meta: { action }`.
 *
 * Auth rejections are handled *before* this is ever called — Re-authentication owns that case, so
 * no Notice fires for it (see the MutationCache handler in queryClient.ts).
 */
export function mutationErrorNotice(error: unknown, action: string): string {
  if (error instanceof SubsonicNetworkError) {
    return "You're offline — change not saved";
  }
  return `Couldn't ${action}`;
}
