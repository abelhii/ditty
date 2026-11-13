import { buildRequestUrl } from '@/api/subsonic/client';
import type { SubsonicAuth } from '@/api/subsonic/types';

/** How hard the server may transcode a stream. `original` is the default: the untouched file. */
export type StreamQuality = 'original' | 'high' | 'normal' | 'low';

/** `maxBitRate` (kbps) sent with `format=mp3` for each lossy quality; `original` sends nothing. */
export const STREAM_QUALITY_BITRATE = { high: 320, normal: 192, low: 96 } as const;

/**
 * Builds a signed streaming URL. With `original` (the default) it is the untouched file — bit-perfect,
 * no transcode: we send no `format`/`maxBitRate`, so the server streams `format=raw`. expo-audio
 * decodes FLAC — including 24-bit — natively: ExoPlayer/Media3 on Android, AVFoundation on iOS, the
 * browser's `<audio>` on web. Lossless is the right default for a lossless library.
 *
 * Any other quality is an opt-in data saver: the server transcodes to MP3 capped at that bitrate.
 */
export function getStreamUrl(
  serverUrl: string,
  trackId: string,
  auth: SubsonicAuth,
  quality: StreamQuality = 'original',
): string {
  const lossy = quality !== 'original';
  const params = {
    id: trackId,
    format: lossy ? 'mp3' : undefined,
    maxBitRate: lossy ? STREAM_QUALITY_BITRATE[quality] : undefined,
  };
  return buildRequestUrl(serverUrl, 'stream', params, auth).toString();
}

/**
 * Builds a signed URL for the server's `download` endpoint — the original file, used for offline
 * downloads (docs: issue #38). Unlike `stream` it never transcodes.
 */
export function getDownloadUrl(serverUrl: string, trackId: string, auth: SubsonicAuth): string {
  return buildRequestUrl(serverUrl, 'download', { id: trackId }, auth).toString();
}

/** Fixed cover art sizes, shared by every call site. */
export const CoverArtSize = {
  /** List rows / thumbnails. */
  list: 150,
  /** Album grid tiles on 2x screens (phone, tablet, desktop). */
  grid: 400,
  /** Album/artist detail headers. */
  detail: 600,
} as const;

/** Picks the smallest fixed {@link CoverArtSize} that covers an image drawn `renderWidth` logical
 *  pixels wide at `pixelRatio`, so it isn't upscaled. Falls back to the largest size. Only fixed
 *  sizes are returned, since each size is a separate image-cache entry. */
export function coverArtSizeFor(renderWidth: number, pixelRatio: number): number {
  const physicalWidth = renderWidth * pixelRatio;
  if (physicalWidth <= CoverArtSize.list) return CoverArtSize.list;
  if (physicalWidth <= CoverArtSize.grid) return CoverArtSize.grid;
  return CoverArtSize.detail;
}

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
