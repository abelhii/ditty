import { SubsonicNetworkError } from '@/api/subsonic/errors';

/**
 * The wording for a failed query with nothing cached to show. A `SubsonicNetworkError` only says
 * "no response", so `deviceOffline` (the connectivity probe, ADR 0007) decides between "you're
 * offline" and "the server is the problem". Every other error carries its own message (the server
 * answered, so it is not a connectivity problem).
 */
export function queryErrorMessage(error: unknown, deviceOffline: boolean): string {
  if (error instanceof SubsonicNetworkError) {
    if (deviceOffline) {
      return "You're offline and haven't viewed this yet. Downloaded music is still available.";
    }
    return error.kind === 'timeout'
      ? "Your server didn't respond in time. Check that it's running, then retry."
      : "Can't reach your server. Check that it's running and the URL is correct, then retry.";
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
