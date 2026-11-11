import type { Album, Track } from '@/api/types';
import type { CollectionKind } from '@/features/downloads/downloads-db';

/** Web has no file download (see downloads-runtime.ts) — every operation is a no-op. */
export function downloadTracks(_kind: CollectionKind, _collectionId: string, _tracks: Track[]): void {}
export function cancelDownload(_trackId: string): void {}
export function cancelDownloads(_trackIds: string[]): void {}
export function hydrateDownloads(): void {}
export function removeTrackDownload(_trackId: string): void {}
export function removeCollectionDownload(
  _kind: CollectionKind,
  _collectionId: string,
  _trackIds: string[],
): void {}
export function getDownloadedAlbum(_albumId: string): { album: Album; tracks: Track[] } | null {
  return null;
}

export type DownloadSummary = {
  groups: { key: string; albumName: string; artist: string; trackIds: string[]; sizeBytes: number }[];
  totalBytes: number;
};
export function getDownloadSummary(): DownloadSummary {
  return { groups: [], totalBytes: 0 };
}
export function removeTrackDownloads(_trackIds: string[]): void {}
export function removeAllDownloads(): void {}
