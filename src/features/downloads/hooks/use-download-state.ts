import { useMemo } from 'react';

import { collectionDownloadState, trackDownloadState } from '@/features/downloads/download-state';
import type { DownloadStateView } from '@/features/downloads/download-state';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

/** Download state for one track row/menu. Selects the raw maps (stable references) and derives the
 *  view in a memo, so a selector never returns a fresh object per render. */
export function useTrackDownloadState(trackId: string | undefined): DownloadStateView {
  const items = useDownloadsStore((state) => state.items);
  const downloadedIds = useDownloadsStore((state) => state.downloadedIds);
  return useMemo(
    () => (trackId ? trackDownloadState(items, downloadedIds, trackId) : { kind: 'idle', progress: 0 }),
    [items, downloadedIds, trackId],
  );
}

export function useCollectionDownloadState(trackIds: string[]): DownloadStateView {
  const items = useDownloadsStore((state) => state.items);
  const downloadedIds = useDownloadsStore((state) => state.downloadedIds);
  return useMemo(
    () => collectionDownloadState(items, downloadedIds, trackIds),
    [items, downloadedIds, trackIds],
  );
}
