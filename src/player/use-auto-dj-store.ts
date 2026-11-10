import { create } from 'zustand';

import { RECENT_WINDOW } from '@/player/auto-dj';

type AutoDjState = {
  enabled: boolean;
  /** Ids of Tracks Auto-DJ recently added, oldest first, capped at RECENT_WINDOW. Session-only. */
  recentIds: string[];

  setEnabled: (enabled: boolean) => void;
  remember: (ids: string[]) => void;
  reset: () => void;
};

/** Client/session state for Auto-DJ. Deliberately not persisted and not part of `QueueState`
 *  (no ADR 0006 persist version bump); the settings issue decides what becomes durable. */
export const useAutoDjStore = create<AutoDjState>((set) => ({
  enabled: false,
  recentIds: [],

  setEnabled: (enabled) => set({ enabled }),
  remember: (ids) => set((s) => ({ recentIds: [...s.recentIds, ...ids].slice(-RECENT_WINDOW) })),
  reset: () => set({ enabled: false, recentIds: [] }),
}));
