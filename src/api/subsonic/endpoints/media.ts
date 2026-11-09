import { buildRequestUrl } from '@/api/subsonic/client';
import type { SubsonicAuth } from '@/api/subsonic/types';

/**
 * Builds a signed streaming URL for the original, untouched file — bit-perfect, no transcode.
 *
 * We stream `format=raw` (the server default when no `format` is given) on every platform. expo-audio
 * decodes FLAC — including 24-bit — natively: ExoPlayer/Media3 on Android, AVFoundation on iOS, the
 * browser's `<audio>` on web. This supersedes the earlier MP3 transcode workaround that existed only
 * because `react-native-audio-api` output silence for 24-bit sources on Android
 * (docs/adr/0008-transcode-stream-to-mp3.md, superseded by docs/adr/0009-expo-audio-lossless.md).
 *
 * A user-selectable "data saver" that re-adds `format=mp3`/`maxBitRate` is a clean later follow-up;
 * lossless is the right default for a lossless library.
 */
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
