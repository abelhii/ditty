import { useMemo } from 'react';

import { rowDownloadState } from '@/features/downloads/download-state';
import type { RowDownloadStateView } from '@/features/downloads/download-state';
import type { CollectionKind } from '@/features/downloads/downloads-db';
import { getCollectionTrackIds } from '@/features/downloads/downloads-runtime';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

/** Download state of a My Music Playlist/Album row, which has no Track list: membership comes from
 *  the downloads DB and is re-read whenever the store changes (every queue/remove step touches it).
 *  Kept apart from `use-download-state` so Track rows don't pull in the downloads runtime. */
export function useCollectionRowDownloadState(
  kind: CollectionKind,
  collectionId: string,
): { state: RowDownloadStateView; memberIds: string[] } {
  const items = useDownloadsStore((state) => state.items);
  const downloadedIds = useDownloadsStore((state) => state.downloadedIds);
  return useMemo(() => {
    const memberIds = getCollectionTrackIds(kind, collectionId);
    return { state: rowDownloadState(items, downloadedIds, memberIds), memberIds };
  }, [items, downloadedIds, kind, collectionId]);
}
