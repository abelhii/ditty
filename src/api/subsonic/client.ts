import * as Crypto from 'expo-crypto';
import { md5 } from 'js-md5';
import { Platform } from 'react-native';

import { SubsonicApiError, SubsonicHttpError, SubsonicNetworkError } from '@/api/subsonic/errors';
import type { SubsonicAuth, SubsonicEnvelope } from '@/api/subsonic/types';

// Bumping this requires checking the target server actually supports the newer API version.
const API_VERSION = '1.16.1';
const CLIENT_NAME = 'ditty';
/** How long a request may take (headers and body) before it is aborted as a timeout. */
export const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Normalizes user-entered server URLs: trims whitespace, defaults to https when no scheme
 * is given, and strips a trailing slash or `/rest` suffix some users paste straight from the
 * Subsonic API docs. Throws on empty or unparseable input.
 */
export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Server URL is required.');
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error('Enter a valid server URL.');
  }

  const path = url.pathname.replace(/\/+$/, '').replace(/\/rest$/i, '');
  return `${url.origin}${path}`;
}

/** Builds a fully-qualified, signed Subsonic REST request URL for the given endpoint. */
export function buildRequestUrl(
  serverUrl: string,
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>,
  auth: SubsonicAuth,
): URL {
  const url = new URL(`${normalizeServerUrl(serverUrl)}/rest/${endpoint}.view`);

  url.searchParams.set('u', auth.username);
  url.searchParams.set('t', auth.token);
  url.searchParams.set('s', auth.salt);
  url.searchParams.set('v', API_VERSION);
  url.searchParams.set('c', CLIENT_NAME);
  url.searchParams.set('f', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

/** Generates a random salt for a new login. Not reused across logins — see `useAuthStore`. */
export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes the Subsonic auth token: `md5(password + salt)`. The password never leaves this call.
 * expo-crypto's native MD5 digest isn't available on web (browsers' WebCrypto API excludes MD5),
 * so web falls back to a pure-JS implementation.
 */
export async function computeToken(password: string, salt: string): Promise<string> {
  if (Platform.OS === 'web') {
    return md5(password + salt);
  }

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, password + salt, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/** Signs and sends a Subsonic REST request, unwraps the envelope, and throws on server error. */
export async function request<T = Record<string, never>>(
  serverUrl: string,
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>,
  auth: SubsonicAuth,
): Promise<T> {
  const url = buildRequestUrl(serverUrl, endpoint, params, auth);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let response: Response;
  let body: SubsonicEnvelope<T>;
  try {
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (cause) {
      throw new SubsonicNetworkError(cause, timedOut ? 'timeout' : 'unreachable');
    }

    // An error status can still carry a Subsonic JSON envelope, so only give up on it if the
    // body isn't one.
    try {
      body = await response.json();
    } catch (cause) {
      if (timedOut) throw new SubsonicNetworkError(cause, 'timeout');
      throw new SubsonicHttpError(response.status, cause);
    }
  } finally {
    clearTimeout(timer);
  }

  if (!body?.['subsonic-response']) {
    throw new SubsonicHttpError(response.status);
  }

  const envelope = body['subsonic-response'];
  if (envelope.status === 'failed') {
    throw new SubsonicApiError(envelope.error?.code ?? 0, envelope.error?.message);
  }

  return envelope as T;
}

/** Validates that `auth` authenticates successfully against `serverUrl`. Throws on failure. */
export async function ping(serverUrl: string, auth: SubsonicAuth): Promise<void> {
  await request(serverUrl, 'ping', {}, auth);
}
