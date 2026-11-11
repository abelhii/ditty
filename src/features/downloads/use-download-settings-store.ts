import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';

type DownloadSettingsState = {
  /** Only start downloads on Wi-Fi/ethernet, never on cellular. */
  wifiOnly: boolean;
  setWifiOnly: (wifiOnly: boolean) => void;
};

type Persisted = { wifiOnly: boolean };

const jsonStorage = createJSONStorage<Persisted>((): StateStorage => ({ getItem, setItem, removeItem }));

export const useDownloadSettingsStore = create<DownloadSettingsState>()(
  persist(
    (set) => ({
      wifiOnly: true,
      setWifiOnly: (wifiOnly) => set({ wifiOnly }),
    }),
    {
      name: 'music-player-download-settings',
      version: 1,
      storage: jsonStorage,
      partialize: (state): Persisted => ({ wifiOnly: state.wifiOnly }),
    },
  ),
);
