import { create } from 'zustand';

import type { DownloadItem } from '@/features/downloads/download-manager';

type DownloadsState = {
  /** Transient queue state (queued / downloading / failed) per track id. */
  items: Record<string, DownloadItem>;
  /** Ids of fully downloaded tracks — an index of the downloads DB so rows can render the badge
   *  without a query per row. The DB stays the source of truth; this is hydrated from it and kept
   *  in step by the runtime. */
  downloadedIds: Record<string, true>;
  setItem: (trackId: string, item: DownloadItem | null) => void;
  setDownloadedIds: (ids: string[]) => void;
  markDownloaded: (ids: string[]) => void;
  markRemoved: (ids: string[]) => void;
};

export const useDownloadsStore = create<DownloadsState>((set) => ({
  items: {},
  downloadedIds: {},
  setItem: (trackId, item) =>
    set((state) => {
      const { [trackId]: _removed, ...rest } = state.items;
      return { items: item ? { ...rest, [trackId]: item } : rest };
    }),
  setDownloadedIds: (ids) => set({ downloadedIds: Object.fromEntries(ids.map((id) => [id, true as const])) }),
  markDownloaded: (ids) =>
    set((state) => ({
      downloadedIds: { ...state.downloadedIds, ...Object.fromEntries(ids.map((id) => [id, true as const])) },
    })),
  markRemoved: (ids) =>
    set((state) => {
      const next = { ...state.downloadedIds };
      for (const id of ids) delete next[id];
      return { downloadedIds: next };
    }),
}));
