import type { DownloadItem } from '@/features/downloads/download-manager';

export type DownloadStateKind = 'idle' | 'queued' | 'downloading' | 'failed' | 'downloaded';

export type DownloadStateView = {
  kind: DownloadStateKind;
  /** 0..1 — meaningful for `downloading`; 1 for `downloaded`. */
  progress: number;
};

type Items = Record<string, DownloadItem>;
type DownloadedIds = Record<string, true>;

/** The state a single Track's row shows. An in-flight/failed item wins over a stale downloaded flag
 *  (re-downloading, or a retry after failure). */
export function trackDownloadState(items: Items, downloadedIds: DownloadedIds, trackId: string): DownloadStateView {
  const item = items[trackId];
  if (item) return { kind: item.status, progress: item.progress };
  if (downloadedIds[trackId]) return { kind: 'downloaded', progress: 1 };
  return { kind: 'idle', progress: 0 };
}

/**
 * The state of an album/playlist as a whole. Fully downloaded → `downloaded`; anything queued or
 * downloading → `downloading` with overall progress; else a failure → `failed`; a partly downloaded
 * collection with nothing running is `idle`, so the button offers to fetch the remainder.
 */
export function collectionDownloadState(
  items: Items,
  downloadedIds: DownloadedIds,
  trackIds: string[],
): DownloadStateView {
  if (trackIds.length === 0) return { kind: 'idle', progress: 0 };

  let downloaded = 0;
  let activeProgress = 0;
  let active = 0;
  let failed = 0;
  for (const id of trackIds) {
    const state = trackDownloadState(items, downloadedIds, id);
    if (state.kind === 'downloaded') downloaded++;
    else if (state.kind === 'queued' || state.kind === 'downloading') {
      active++;
      activeProgress += state.progress;
    } else if (state.kind === 'failed') failed++;
  }

  if (downloaded === trackIds.length) return { kind: 'downloaded', progress: 1 };
  if (active > 0) return { kind: 'downloading', progress: (downloaded + activeProgress) / trackIds.length };
  if (failed > 0) return { kind: 'failed', progress: 0 };
  return { kind: 'idle', progress: 0 };
}
