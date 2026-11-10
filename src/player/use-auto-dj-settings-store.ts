import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';

/** Where Auto-DJ draws Tracks from. `mixed` = same-genre plus Last.fm similar (when the server has
 *  it), `genre` = same-genre only, `random` = anywhere in the Library. */
export type AutoDjSource = 'mixed' | 'genre' | 'random';

export const DEFAULT_AUTO_DJ_SETTINGS = {
  enabledByDefault: false,
  /** 0 to 100: the share of picks taken from anywhere in the Library instead of the source. */
  randomness: 30,
  source: 'mixed' as AutoDjSource,
};

type AutoDjSettings = typeof DEFAULT_AUTO_DJ_SETTINGS;

type AutoDjSettingsState = AutoDjSettings & {
  setEnabledByDefault: (enabledByDefault: boolean) => void;
  setRandomness: (randomness: number) => void;
  setSource: (source: AutoDjSource) => void;
  reset: () => void;
};

const jsonStorage = createJSONStorage<AutoDjSettings>(
  (): StateStorage => ({ getItem, setItem, removeItem }),
);

/** The user's durable Auto-DJ preferences, read on each refill so a change applies to the next
 *  batch. The per-session on/off flag lives in `useAutoDjStore`, which starts from
 *  `enabledByDefault`. kvStorage is synchronous, so `persist` hydrates at creation. */
export const useAutoDjSettingsStore = create<AutoDjSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_AUTO_DJ_SETTINGS,
      setEnabledByDefault: (enabledByDefault) => set({ enabledByDefault }),
      setRandomness: (randomness) => set({ randomness: Math.max(0, Math.min(100, randomness)) }),
      setSource: (source) => set({ source }),
      reset: () => set(DEFAULT_AUTO_DJ_SETTINGS),
    }),
    {
      name: 'music-player-auto-dj-settings',
      version: 1,
      storage: jsonStorage,
      partialize: (state): AutoDjSettings => ({
        enabledByDefault: state.enabledByDefault,
        randomness: state.randomness,
        source: state.source,
      }),
    },
  ),
);
