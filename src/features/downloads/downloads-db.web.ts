import type { Track } from '@/api/types';
import type { DownloadRecord } from '@/features/downloads/download-rows';

/** Web has no file download (see downloads-db.ts) — every operation is a no-op. */
export type CollectionKind = 'album' | 'playlist' | 'track' | 'favourites';

export function saveDownload(_server: string, _record: DownloadRecord): void {}
export function getDownload(_server: string, _trackId: string): DownloadRecord | null {
  return null;
}
export function listDownloads(_server: string): DownloadRecord[] {
  return [];
}
export function addMembership(
  _server: string,
  _kind: CollectionKind,
  _collectionId: string,
  _track: Track,
): void {}
export function releaseCollection(
  _server: string,
  _kind: CollectionKind,
  _collectionId: string,
): DownloadRecord[] {
  return [];
}
export function listCollectionIds(_server: string, _kind: CollectionKind): string[] {
  return [];
}
export function listCollectionTrackIds(
  _server: string,
  _kind: CollectionKind,
  _collectionId: string,
): string[] {
  return [];
}
export function releaseTracksFromCollection(
  _server: string,
  _kind: CollectionKind,
  _collectionId: string,
  _trackIds: string[],
): DownloadRecord[] {
  return [];
}
export function listDownloadedIds(_server: string): string[] {
  return [];
}
export function releaseTrack(_server: string, _trackId: string): void {}
export function deleteDownload(_server: string, _trackId: string): void {}
export function clearServer(_server: string): void {}
