import { buildRequestUrl } from '@/api/subsonic/client';
import type { SubsonicAuth } from '@/api/subsonic/types';

/** Builds a signed URL that streams the given track's audio directly from the server. */
export function getStreamUrl(serverUrl: string, trackId: string, auth: SubsonicAuth): string {
  return buildRequestUrl(serverUrl, 'stream', { id: trackId }, auth).toString();
}
