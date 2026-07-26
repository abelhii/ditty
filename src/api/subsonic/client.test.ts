import { Platform } from 'react-native';

import { buildRequestUrl, computeToken, normalizeServerUrl } from '@/api/subsonic/client';

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
