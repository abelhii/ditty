import { buildRequestUrl } from '@/api/subsonic/client';
import type { SubsonicAuth } from '@/api/subsonic/types';

/**
 * Builds a signed streaming URL for bit-perfect, untranscoded playback on every platform.
 *
 * `format=raw` tells Subsonic/Navidrome to serve the original bytes and skip any per-player
 * transcoding it might otherwise apply. Web already relied on the browser's native FLAC decode; now
 * native does the same through `react-native-audio-api`'s streaming `<Audio>` tag, so a lossless
 * library streams lossless rather than as 320 kbps MP3.
 *
 * This supersedes the unconditional MP3 transcode of ADR 0008, which existed only to dodge a
 * 24-bit-FLAC-silent-on-Android bug in the library's `<Audio>` output. We're validating on-device
 * whether that bug still bites at 0.13.2 (and on which files) before deciding any per-platform
 * fallback — see docs/adr/0008-transcode-stream-to-mp3.md.
 */
export function getStreamUrl(serverUrl: string, trackId: string, auth: SubsonicAuth): string {
  return buildRequestUrl(serverUrl, 'stream', { id: trackId, format: 'raw' }, auth).toString();
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
