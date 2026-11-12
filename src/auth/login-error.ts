import { isServerUnreachable } from '@/api/subsonic/errors';

/**
 * The login failure message. `normalizeServerUrl` defaults a scheme-less URL to https, so when the
 * server couldn't be reached (or didn't answer like Subsonic) for such a URL, a LAN server that only
 * speaks http is the likeliest cause — say so. Auth and API errors pass through untouched: the
 * server answered, the scheme was fine.
 */
export function loginErrorMessage(error: unknown, serverUrlInput: string): string {
  if (!(error instanceof Error)) return 'Login failed.';
  const connectionProblem = isServerUnreachable(error);
  const hasScheme = /^\s*[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(serverUrlInput);
  if (!connectionProblem || hasScheme) return error.message;
  return `${error.message} No http:// or https:// was given, so https:// was tried. For a server on your local network, try http:// (a web page served over HTTPS can't call an http:// server).`;
}
