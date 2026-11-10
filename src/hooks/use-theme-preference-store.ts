import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemePreferenceState = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

type PersistedThemePreference = { preference: ThemePreference };

/** kvStorage is synchronous on every platform, so `persist` hydrates during store creation and the
 *  first render already sees the saved choice — no flash of the wrong theme. */
const jsonStorage = createJSONStorage<PersistedThemePreference>(
  (): StateStorage => ({ getItem, setItem, removeItem }),
);

export const useThemePreferenceStore = create<ThemePreferenceState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'music-player-theme-preference',
      version: 1,
      storage: jsonStorage,
      partialize: (state): PersistedThemePreference => ({ preference: state.preference }),
    },
  ),
);
