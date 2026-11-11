import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';

type OfflineState = {
  /** The user's own "Offline mode" toggle — persisted. */
  manual: boolean;
  /** No connectivity right now, per expo-network — transient, never persisted. */
  deviceOffline: boolean;
  setManual: (manual: boolean) => void;
  setDeviceOffline: (offline: boolean) => void;
};

type PersistedOffline = { manual: boolean };

const jsonStorage = createJSONStorage<PersistedOffline>(
  (): StateStorage => ({ getItem, setItem, removeItem }),
);

/** Offline mode is on when the user switched it on *or* the device has no connection. The two are
 *  kept separate so regaining signal doesn't flip off a deliberate manual choice. */
export function isOfflineMode(state: Pick<OfflineState, 'manual' | 'deviceOffline'>): boolean {
  return state.manual || state.deviceOffline;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      manual: false,
      deviceOffline: false,
      setManual: (manual) => set({ manual }),
      setDeviceOffline: (deviceOffline) => set({ deviceOffline }),
    }),
    {
      name: 'music-player-offline-mode',
      version: 1,
      storage: jsonStorage,
      partialize: (state): PersistedOffline => ({ manual: state.manual }),
    },
  ),
);

/** React hook: is Offline mode on? */
export function useOfflineMode(): boolean {
  return useOfflineStore(isOfflineMode);
}
