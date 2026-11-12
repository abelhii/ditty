import { create } from 'zustand';

import { RECENT_WINDOW } from '@/player/auto-dj';
import { useAutoDjSettingsStore } from '@/player/use-auto-dj-settings-store';

type AutoDjState = {
  enabled: boolean;
  /** Ids of Tracks Auto-DJ recently added, oldest first, capped at RECENT_WINDOW. Session-only. */
  recentIds: string[];

  setEnabled: (enabled: boolean) => void;
  remember: (ids: string[]) => void;
  reset: () => void;
};

/** Client/session state for Auto-DJ. Not persisted and not part of `QueueState` (no persist
 *  version bump); each launch starts from the durable `enabledByDefault` setting. */
export const useAutoDjStore = create<AutoDjState>((set) => ({
  enabled: useAutoDjSettingsStore.getState().enabledByDefault,
  recentIds: [],

  setEnabled: (enabled) => set({ enabled }),
  remember: (ids) => set((s) => ({ recentIds: [...s.recentIds, ...ids].slice(-RECENT_WINDOW) })),
  reset: () => set({ enabled: false, recentIds: [] }),
}));
