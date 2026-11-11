import * as Network from 'expo-network';
import { Platform } from 'react-native';

import { useOfflineStore } from '@/features/downloads/use-offline-store';

/** Same rule as `utils/network.ts`'s probe: only claim offline when a field says so explicitly —
 *  an undefined reading means "can't tell". */
export function isStateOffline(state: Pick<Network.NetworkState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isInternetReachable === false || state.isConnected === false;
}

/** Mirrors device connectivity into `useOfflineStore.deviceOffline`. Returns an unsubscribe. */
export function startOfflineWatcher(): () => void {
  // Web can't download, so Offline mode has nothing to offer there; a flaky `navigator.onLine`
  // must not grey out the whole app.
  if (Platform.OS === 'web') return () => {};

  const apply = (state: Pick<Network.NetworkState, 'isConnected' | 'isInternetReachable'>) =>
    useOfflineStore.getState().setDeviceOffline(isStateOffline(state));

  Network.getNetworkStateAsync().then(apply, () => {
    // A failed probe tells us nothing — leave the flag as is rather than assert offline.
  });
  const subscription = Network.addNetworkStateListener(apply);
  return () => subscription.remove();
}
