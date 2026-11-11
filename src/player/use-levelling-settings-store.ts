import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';
import type { LevellingMode } from '@/player/replay-gain';

type LevellingSettings = { mode: LevellingMode };

type LevellingSettingsState = LevellingSettings & {
  setMode: (mode: LevellingMode) => void;
};

const jsonStorage = createJSONStorage<LevellingSettings>(
  (): StateStorage => ({ getItem, setItem, removeItem }),
);

/** The user's durable volume-levelling preference. Off by default: levelling changes loudness, so
 *  it's opt-in. kvStorage is synchronous, so `persist` hydrates at creation. */
export const useLevellingSettingsStore = create<LevellingSettingsState>()(
  persist(
    (set) => ({
      mode: 'off',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'music-player-levelling-settings',
      version: 1,
      storage: jsonStorage,
      partialize: (state): LevellingSettings => ({ mode: state.mode }),
    },
  ),
);
