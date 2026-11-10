import { create } from 'zustand';

import type { DownloadItem } from '@/features/downloads/download-manager';

type DownloadsState = {
  /** Transient queue state only (queued / downloading / failed). Finished downloads live in the
   *  downloads DB, never here — don't duplicate durable data into a store. */
  items: Record<string, DownloadItem>;
  setItem: (trackId: string, item: DownloadItem | null) => void;
};

export const useDownloadsStore = create<DownloadsState>((set) => ({
  items: {},
  setItem: (trackId, item) =>
    set((state) => {
      const { [trackId]: _removed, ...rest } = state.items;
      return { items: item ? { ...rest, [trackId]: item } : rest };
    }),
}));
