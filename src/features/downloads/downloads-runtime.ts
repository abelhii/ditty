import { File } from 'expo-file-system';

import { SubsonicApiError } from '@/api/subsonic/errors';
import { getCoverArtUrl, CoverArtSize, getDownloadUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { showNotice } from '@/components/use-notice-store';
import { parseApiErrorBody } from '@/features/downloads/api-error-body';
import { createDownloadManager } from '@/features/downloads/download-manager';
import { audioFileName, coverFileName, serverKey } from '@/features/downloads/download-paths';
import {
  addMembership,
  getDownload,
  saveDownload,
} from '@/features/downloads/downloads-db';
import type { CollectionKind } from '@/features/downloads/downloads-db';
import {
  deleteFile,
  ensureServerDirectory,
  fileSize,
} from '@/features/downloads/downloads-files';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

/** Error bodies are a few hundred bytes; audio is never this small, so only tiny files are read. */
const ERROR_BODY_MAX_BYTES = 4096;
const CONCURRENCY = 2;
const MAX_ATTEMPTS = 3;

function destinationUri(server: string, name: string): string {
  return new File(ensureServerDirectory(server), name).uri;
}

const manager = createDownloadManager({
  concurrency: CONCURRENCY,
  maxAttempts: MAX_ATTEMPTS,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  getContext: () => {
    const credentials = useAuthStore.getState().credentials;
    if (!credentials) return null;
    return {
      server: serverKey(credentials.serverUrl, credentials.username),
      serverUrl: credentials.serverUrl,
      auth: credentials,
    };
  },
  audioUri: (context, track) => destinationUri(context.server, audioFileName(track.id, track.suffix)),
  coverUri: (context, coverArtId) => destinationUri(context.server, coverFileName(coverArtId)),
  audioUrl: (context, track) => getDownloadUrl(context.serverUrl, track.id, context.auth),
  coverUrl: (context, coverArtId) =>
    getCoverArtUrl(context.serverUrl, coverArtId, context.auth, CoverArtSize.detail) ?? '',
  fetchFile: async (url, destUri, { signal, onProgress }) => {
    const file = await File.downloadFileAsync(url, new File(destUri), {
      idempotent: true,
      signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (totalBytes > 0) onProgress(bytesWritten / totalBytes);
      },
    });
    const size = fileSize(file.uri);
    if (size < ERROR_BODY_MAX_BYTES) {
      const code = parseApiErrorBody(await file.text());
      if (code !== null) throw new SubsonicApiError(code);
    }
    return size;
  },
  deleteFile,
  getDownload,
  saveDownload,
  addMembership,
  setItem: (trackId, item) => useDownloadsStore.getState().setItem(trackId, item),
  onAuthError: () => useAuthStore.getState().sessionExpired(),
  notifyFailures: (count) =>
    showNotice(count === 1 ? "Couldn't download 1 track." : `Couldn't download ${count} tracks.`),
});

// Re-authentication replaces the token the parked queue was signed with; continue once it succeeds.
useAuthStore.subscribe((state, previous) => {
  if (previous.reauthRequired && !state.reauthRequired) manager.resume();
});

export function downloadTracks(kind: CollectionKind, collectionId: string, tracks: Track[]): void {
  manager.enqueue(kind, collectionId, tracks);
}

export function cancelDownload(trackId: string): void {
  manager.cancel(trackId);
}
