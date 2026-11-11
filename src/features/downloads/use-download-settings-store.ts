import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';

type DownloadSettingsState = {
  /** Only start downloads on Wi-Fi/ethernet, never on cellular. */
  wifiOnly: boolean;
  setWifiOnly: (wifiOnly: boolean) => void;
  /** Keep every starred song downloaded, syncing as Favourites change. Off by default — it can
   *  quietly fill the phone. */
  autoDownloadFavourites: boolean;
  setAutoDownloadFavourites: (value: boolean) => void;
};

type Persisted = { wifiOnly: boolean; autoDownloadFavourites: boolean };

const jsonStorage = createJSONStorage<Persisted>((): StateStorage => ({ getItem, setItem, removeItem }));

export const useDownloadSettingsStore = create<DownloadSettingsState>()(
  persist(
    (set) => ({
      wifiOnly: true,
      setWifiOnly: (wifiOnly) => set({ wifiOnly }),
      autoDownloadFavourites: false,
      setAutoDownloadFavourites: (autoDownloadFavourites) => set({ autoDownloadFavourites }),
    }),
    {
      name: 'music-player-download-settings',
      version: 1,
      storage: jsonStorage,
      partialize: (state): Persisted => ({
        wifiOnly: state.wifiOnly,
        autoDownloadFavourites: state.autoDownloadFavourites,
      }),
    },
  ),
);
