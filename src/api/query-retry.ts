import { SubsonicNetworkError } from '@/api/subsonic/errors';

const MAX_RETRIES = 3;

/** React Query's default is 3 retries; keep that, except never retry a timeout — each attempt
 *  already waited the full request timeout, so retrying would hold the error back for about a minute. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof SubsonicNetworkError && error.kind === 'timeout') return false;
  return failureCount < MAX_RETRIES;
}
