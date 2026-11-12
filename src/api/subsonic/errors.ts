// Subsonic API error codes, per http://www.subsonic.org/pages/api.jsp
const SUBSONIC_ERROR_MESSAGES: Record<number, string> = {
  0: 'A generic error occurred on the server.',
  10: 'Required parameter is missing.',
  20: "Incompatible client version — server requires a newer client.",
  30: 'Incompatible server version — server is too old for this client.',
  40: 'Wrong username or password.',
  41: 'Token authentication is not supported for LDAP users.',
  50: 'User is not authorized for the given operation.',
  60: 'The trial period for the server is over.',
  70: 'The requested data was not found.',
};

export class SubsonicApiError extends Error {
  readonly code: number;

  constructor(code: number, message?: string) {
    super(message ?? SUBSONIC_ERROR_MESSAGES[code] ?? `Unknown Subsonic error (code ${code}).`);
    this.name = 'SubsonicApiError';
    this.code = code;
  }

  /** True for the "wrong username or password" case — the case a login form should surface distinctly. */
  get isAuthError(): boolean {
    return this.code === 40 || this.code === 41;
  }
}

/** True when the server couldn't be used at all: no response, or a reply that isn't Subsonic (a
 *  proxy's 502 page). Callers that fall back to local data (e.g. a downloaded album) use this. */
export function isServerUnreachable(error: unknown): boolean {
  return error instanceof SubsonicNetworkError || error instanceof SubsonicHttpError;
}

export type SubsonicNetworkErrorKind = 'unreachable' | 'timeout';

/** `fetch` itself failed: no response at all. `timeout` means the request was aborted for taking
 *  too long; `unreachable` covers DNS, refused/reset connections, TLS and offline devices (the
 *  error can't tell those apart — use the connectivity probe for "device offline"). */
export class SubsonicNetworkError extends Error {
  readonly kind: SubsonicNetworkErrorKind;

  constructor(cause: unknown, kind: SubsonicNetworkErrorKind = 'unreachable') {
    super(
      kind === 'timeout'
        ? "The server didn't respond in time. Check the URL and that the server is running."
        : 'Could not reach the server. Check the URL and your network connection.',
    );
    this.name = 'SubsonicNetworkError';
    this.cause = cause;
    this.kind = kind;
  }
}

/** The server answered, but not with a Subsonic JSON envelope: a non-2xx status (typically a
 *  reverse proxy's 404/502 page) or a body that isn't Subsonic JSON. Distinct from
 *  `SubsonicNetworkError` because the host is reachable. */
export class SubsonicHttpError extends Error {
  readonly status: number;

  constructor(status: number, cause?: unknown) {
    super(
      status >= 200 && status < 300
        ? 'The server responded, but not with a Subsonic API reply. Check the URL (and any path prefix).'
        : `The server responded with HTTP ${status}. Check the URL and that Subsonic/Navidrome is running behind it.`,
    );
    this.name = 'SubsonicHttpError';
    this.status = status;
    this.cause = cause;
  }
}
