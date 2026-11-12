import { Platform } from 'react-native';

import {
  buildRequestUrl,
  computeToken,
  normalizeServerUrl,
  request,
  REQUEST_TIMEOUT_MS,
} from '@/api/subsonic/client';
import { SubsonicApiError, SubsonicHttpError, SubsonicNetworkError } from '@/api/subsonic/errors';

describe('normalizeServerUrl', () => {
  it('trims whitespace', () => {
    expect(normalizeServerUrl('  https://navidrome.example.com  ')).toBe(
      'https://navidrome.example.com',
    );
  });

  it('strips a trailing slash', () => {
    expect(normalizeServerUrl('https://navidrome.example.com/')).toBe(
      'https://navidrome.example.com',
    );
  });

  it('strips a trailing /rest suffix some users paste from the API docs', () => {
    expect(normalizeServerUrl('https://navidrome.example.com/rest')).toBe(
      'https://navidrome.example.com',
    );
    expect(normalizeServerUrl('https://navidrome.example.com/rest/')).toBe(
      'https://navidrome.example.com',
    );
  });

  it('defaults to https when no scheme is given', () => {
    expect(normalizeServerUrl('navidrome.example.com')).toBe('https://navidrome.example.com');
  });

  it('preserves an explicit http scheme (self-hosted/local-network servers)', () => {
    expect(normalizeServerUrl('http://192.168.1.50:4533')).toBe('http://192.168.1.50:4533');
  });

  it('preserves a custom port', () => {
    expect(normalizeServerUrl('https://navidrome.example.com:8443/')).toBe(
      'https://navidrome.example.com:8443',
    );
  });

  it('throws on an empty or whitespace-only input', () => {
    expect(() => normalizeServerUrl('   ')).toThrow();
  });

  it('throws on a malformed url', () => {
    expect(() => normalizeServerUrl('not a url::')).toThrow();
  });
});

describe('buildRequestUrl', () => {
  const auth = { username: 'alice', token: 'abc123', salt: 'xyz789' };

  it('builds a versioned .view endpoint url with auth and format params', () => {
    const url = buildRequestUrl('https://navidrome.example.com', 'ping', {}, auth);
    expect(url.origin + url.pathname).toBe('https://navidrome.example.com/rest/ping.view');
    expect(url.searchParams.get('u')).toBe('alice');
    expect(url.searchParams.get('t')).toBe('abc123');
    expect(url.searchParams.get('s')).toBe('xyz789');
    expect(url.searchParams.get('f')).toBe('json');
    expect(url.searchParams.get('v')).toBeTruthy();
    expect(url.searchParams.get('c')).toBeTruthy();
  });

  it('includes endpoint-specific params alongside auth params', () => {
    const url = buildRequestUrl('https://navidrome.example.com', 'stream', { id: 'track-1' }, auth);
    expect(url.searchParams.get('id')).toBe('track-1');
    expect(url.searchParams.get('u')).toBe('alice');
  });

  it('normalizes the server url before building the endpoint path', () => {
    const url = buildRequestUrl('https://navidrome.example.com/', 'ping', {}, auth);
    expect(url.origin + url.pathname).toBe('https://navidrome.example.com/rest/ping.view');
  });
});

describe('computeToken', () => {
  // expo-crypto's native MD5 isn't available on web, so this path exercises the js-md5 fallback.
  it('computes md5(password + salt) on web, matching the Subsonic docs example', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';
    try {
      const token = await computeToken('sesame', 'c19b2d');
      expect(token).toBe('26719a1196d2a940705a59634eb18eab');
    } finally {
      Platform.OS = originalOS;
    }
  });
});

describe('request', () => {
  const auth = { username: 'alice', token: 'abc123', salt: 'xyz789' };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  function mockFetch(impl: (url: URL, init?: RequestInit) => Promise<Response>) {
    globalThis.fetch = jest.fn(impl as never) as never;
  }

  const okEnvelope = (extra = {}) =>
    ({ ok: true, status: 200, json: async () => ({ 'subsonic-response': { status: 'ok', ...extra } }) }) as Response;

  it('returns the envelope on success', async () => {
    mockFetch(async () => okEnvelope({ version: '1.16.1' }));
    await expect(request('https://s.example.com', 'ping', {}, auth)).resolves.toMatchObject({ status: 'ok' });
  });

  it('throws SubsonicNetworkError (unreachable) when fetch rejects', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });
    const error = await request('https://s.example.com', 'ping', {}, auth).catch((e) => e);
    expect(error).toBeInstanceOf(SubsonicNetworkError);
    expect(error.kind).toBe('unreachable');
  });

  it('throws SubsonicHttpError, not a network error, for a non-JSON error page', async () => {
    mockFetch(async () => ({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('x')) }) as Response);
    const error = await request('https://s.example.com', 'ping', {}, auth).catch((e) => e);
    expect(error).toBeInstanceOf(SubsonicHttpError);
    expect(error.status).toBe(502);
    expect(error.message).toContain('HTTP 502');
  });

  it('throws SubsonicHttpError for a 200 JSON body that is not a Subsonic envelope', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ hello: 'world' }) }) as Response);
    await expect(request('https://s.example.com', 'ping', {}, auth)).rejects.toBeInstanceOf(SubsonicHttpError);
  });

  it('still surfaces a Subsonic error envelope that arrives with an error status', async () => {
    mockFetch(
      async () =>
        ({
          ok: false,
          status: 401,
          json: async () => ({ 'subsonic-response': { status: 'failed', error: { code: 40 } } }),
        }) as Response,
    );
    const error = await request('https://s.example.com', 'ping', {}, auth).catch((e) => e);
    expect(error).toBeInstanceOf(SubsonicApiError);
    expect(error.code).toBe(40);
  });

  it('aborts after REQUEST_TIMEOUT_MS and throws a timeout SubsonicNetworkError', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = request('https://s.example.com', 'ping', {}, auth).catch((e) => e);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    const error = await pending;
    expect(signal?.aborted).toBe(true);
    expect(error).toBeInstanceOf(SubsonicNetworkError);
    expect(error.kind).toBe('timeout');
  });

  it('clears the timer once the response arrives', async () => {
    jest.useFakeTimers();
    mockFetch(async () => okEnvelope());
    await request('https://s.example.com', 'ping', {}, auth);
    expect(jest.getTimerCount()).toBe(0);
  });
});
