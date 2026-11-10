import type { Track } from '@/api/types';
import type { CollectionKind } from '@/features/downloads/downloads-db';

/** Web has no file download (see downloads-runtime.ts) — every operation is a no-op. */
export function downloadTracks(_kind: CollectionKind, _collectionId: string, _tracks: Track[]): void {}
export function cancelDownload(_trackId: string): void {}
