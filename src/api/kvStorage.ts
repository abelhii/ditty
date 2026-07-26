import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

/**
 * The app's one general-purpose synchronous key-value store — used to persist the TanStack
 * Query cache (see queryClient.ts) and anything else that needs simple local durability
 * (recent searches, settings). Native uses expo-sqlite/kv-store (first-party, sync API); web
 * has no equivalent, so it falls back to localStorage — same native-vs-web split already used
 * for credentials, see auth/credentialStorage.ts.
 */
export function getItem(key: string): string | null {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return Storage.getItemSync(key);
}

export function setItem(key: string, value: string): void {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  Storage.setItemSync(key, value);
}

export function removeItem(key: string): void {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  Storage.removeItemSync(key);
}
