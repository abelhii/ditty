import { Platform } from 'react-native';

import { buildRequestUrl } from '@/api/subsonic/client';
import type { SubsonicAuth } from '@/api/subsonic/types';

/** Near-transparent MP3 ceiling for on-the-fly transcoding — see {@link getStreamUrl}. */
const STREAM_MAX_BITRATE = 320;

/**
 * Builds a signed streaming URL.
 *
 * On **web** we stream the original file untouched: the browser's `<audio>` decodes FLAC (incl.
 * 24-bit) natively and losslessly — the same reason Feishin's web player needs no transcoding.
 *
 * On **native** we ask the server to transcode to MP3. `react-native-audio-api` 0.13 decodes 24-bit
 * sources (common in FLAC libraries) but outputs *silence* on Android — it plays 16-bit formats like
 * MP3 fine. Rather than gamble on each file's bit depth, transcode to MP3 (inherently 16-bit);
 * `maxBitRate` keeps it near-transparent. Trade-off: lossy playback on native. Revisit per platform
 * as the library's format support firms up (then stream `format=raw` for bit-perfect FLAC).
 * See docs/adr/0008-transcode-stream-to-mp3.md.
 */
export function getStreamUrl(serverUrl: string, trackId: string, auth: SubsonicAuth): string {
  const params: Record<string, string | number> = { id: trackId };
  if (Platform.OS !== 'web') {
    params.format = 'mp3';
    params.maxBitRate = STREAM_MAX_BITRATE;
  }
  return buildRequestUrl(serverUrl, 'stream', params, auth).toString();
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
