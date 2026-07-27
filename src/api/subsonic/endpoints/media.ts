import { buildRequestUrl } from '@/api/subsonic/client';
import type { SubsonicAuth } from '@/api/subsonic/types';

/** Builds a signed URL that streams the given track's audio directly from the server. */
export function getStreamUrl(serverUrl: string, trackId: string, auth: SubsonicAuth): string {
  return buildRequestUrl(serverUrl, 'stream', { id: trackId }, auth).toString();
}

/** Fixed cover art sizes, shared by every call site — see docs/adr/0003-cover-art-sizing-and-caching.md. */
export const CoverArtSize = {
  /** List rows / thumbnails. */
  list: 150,
  /** Album/artist detail headers. */
  detail: 600,
} as const;

/** Builds a signed cover art URL for the given size, or `undefined` if there's no cover art to
 *  fetch — callers (CoverArtImage) render a placeholder in that case rather than a broken image. */
export function getCoverArtUrl(
  serverUrl: string,
  coverArtId: string | undefined,
  auth: SubsonicAuth,
  size: number,
): string | undefined {
  if (!coverArtId) return undefined;
  return buildRequestUrl(serverUrl, 'getCoverArt', { id: coverArtId, size }, auth).toString();
}
