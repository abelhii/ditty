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

export class SubsonicNetworkError extends Error {
  constructor(cause: unknown) {
    super('Could not reach the server. Check the URL and your network connection.');
    this.name = 'SubsonicNetworkError';
    this.cause = cause;
  }
}
