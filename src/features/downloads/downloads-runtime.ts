import { File } from 'expo-file-system';
import * as Network from 'expo-network';

import { SubsonicApiError } from '@/api/subsonic/errors';
import { getCoverArtUrl, CoverArtSize, getDownloadUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { showNotice } from '@/components/use-notice-store';
import { parseApiErrorBody } from '@/features/downloads/api-error-body';
import { createDownloadManager } from '@/features/downloads/download-manager';
import { audioFileName, coverFileName, serverKey } from '@/features/downloads/download-paths';
import { groupByAlbum } from '@/features/downloads/album-groups';
import type { DownloadGroup } from '@/features/downloads/album-groups';
import { clearServerDownloads } from '@/features/downloads/clear-downloads';
import { albumFromDownloads } from '@/features/downloads/offline-album';
import { removableCovers } from '@/features/downloads/download-rows';
import type { DownloadRecord } from '@/features/downloads/download-rows';
import {
  addMembership,
  deleteDownload,
  getDownload,
  listDownloadedIds,
  listDownloads,
  releaseCollection,
  releaseTrack,
  saveDownload,
} from '@/features/downloads/downloads-db';
import type { CollectionKind } from '@/features/downloads/downloads-db';
import {
  deleteFile,
  ensureServerDirectory,
  fileSize,
} from '@/features/downloads/downloads-files';
import { useDownloadSettingsStore } from '@/features/downloads/use-download-settings-store';
import { isBlockedByWifiOnly } from '@/features/downloads/wifi-only';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

/** Error bodies are a few hundred bytes; audio is never this small, so only tiny files are read. */
const ERROR_BODY_MAX_BYTES = 4096;
const CONCURRENCY = 2;
const MAX_ATTEMPTS = 3;

function destinationUri(server: string, name: string): string {
  return new File(ensureServerDirectory(server), name).uri;
}

function currentServer(): string | null {
  const credentials = useAuthStore.getState().credentials;
  return credentials ? serverKey(credentials.serverUrl, credentials.username) : null;
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
  saveDownload: (server, record) => {
    saveDownload(server, record);
    useDownloadsStore.getState().markDownloaded([record.track.id]);
  },
  addMembership,
  setItem: (trackId, item) => useDownloadsStore.getState().setItem(trackId, item),
  onAuthError: () => useAuthStore.getState().sessionExpired(),
  notifyFailures: (count) =>
    showNotice(count === 1 ? "Couldn't download 1 track." : `Couldn't download ${count} tracks.`),
});

// Re-authentication replaces the token the parked queue was signed with; continue once it succeeds.
useAuthStore.subscribe((state, previous) => {
  if (previous.reauthRequired && !state.reauthRequired) manager.resume();
  // Logout deletes the downloads (see clear-downloads.ts); stop anything still in flight so it can't
  // write a file back afterwards.
  if (previous.status === 'authenticated' && state.status !== 'authenticated') manager.cancelAll();
});

export function downloadTracks(kind: CollectionKind, collectionId: string, tracks: Track[]): void {
  void (async () => {
    // Wi-Fi only is checked when the download is requested; a connection that flips to cellular
    // mid-queue is not re-checked.
    if (useDownloadSettingsStore.getState().wifiOnly) {
      const state = await Network.getNetworkStateAsync().catch(() => null);
      if (isBlockedByWifiOnly(true, state?.type)) {
        showNotice('Downloads are set to Wi-Fi only. Connect to Wi-Fi or change this in Settings.');
        return;
      }
    }
    manager.enqueue(kind, collectionId, tracks);
  })();
}

export function cancelDownload(trackId: string): void {
  manager.cancel(trackId);
}

export function cancelDownloads(trackIds: string[]): void {
  for (const id of trackIds) manager.cancel(id);
}

/** Loads the downloaded-track index from the DB into the store. Call once per signed-in session. */
export function hydrateDownloads(): void {
  const server = currentServer();
  useDownloadsStore.getState().setDownloadedIds(server ? listDownloadedIds(server) : []);
}

/** Deletes the files and rows of `records`, plus cover art nothing else uses. */
function deleteRecords(server: string, records: DownloadRecord[]): void {
  for (const record of records) {
    deleteFile(record.filePath);
    deleteDownload(server, record.track.id);
  }
  for (const cover of removableCovers(records, listDownloads(server))) deleteFile(cover);
  useDownloadsStore.getState().markRemoved(records.map((r) => r.track.id));
}

/** Removes one track's download entirely, whichever album/playlist had asked for it. */
export function removeTrackDownload(trackId: string): void {
  const server = currentServer();
  if (!server) return;
  manager.cancel(trackId);
  const record = getDownload(server, trackId);
  releaseTrack(server, trackId);
  if (record) deleteRecords(server, [record]);
}

/** Removes an album/playlist's claim; tracks another collection still needs are kept. */
export function removeCollectionDownload(
  kind: CollectionKind,
  collectionId: string,
  trackIds: string[],
): void {
  const server = currentServer();
  if (!server) return;
  for (const id of trackIds) manager.cancel(id);
  deleteRecords(server, releaseCollection(server, kind, collectionId));
}

/** An album rebuilt from downloaded tracks (see `albumFromDownloads`), or null. */
export function getDownloadedAlbum(albumId: string) {
  const server = currentServer();
  return server ? albumFromDownloads(albumId, listDownloads(server)) : null;
}

export type DownloadSummary = { groups: DownloadGroup[]; totalBytes: number };

/** What is downloaded right now, grouped by album, for the storage screen. */
export function getDownloadSummary(): DownloadSummary {
  const server = currentServer();
  const records = server ? listDownloads(server) : [];
  const groups = groupByAlbum(records);
  return { groups, totalBytes: groups.reduce((sum, g) => sum + g.sizeBytes, 0) };
}

/** Removes the given tracks' downloads entirely. */
export function removeTrackDownloads(trackIds: string[]): void {
  for (const id of trackIds) removeTrackDownload(id);
}

/** Cancels everything in flight and deletes every download for the signed-in server. */
export function removeAllDownloads(): void {
  const credentials = useAuthStore.getState().credentials;
  if (!credentials) return;
  manager.cancelAll();
  clearServerDownloads(credentials.serverUrl, credentials.username);
}
