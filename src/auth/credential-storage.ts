import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'subsonic-auth';

/**
 * Persists the auth credentials blob. Native uses expo-secure-store (Keychain/Keystore,
 * encrypted at rest); web has no equivalent available to a client-side SPA, so it falls back
 * to localStorage — plaintext and XSS-exposed, an accepted trade-off since only a revocable
 * salt/token pair is stored, never the password (see PLAN.md's Secrets row).
 */
export async function readPersistedCredentials(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(STORAGE_KEY);
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

export async function writePersistedCredentials(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

export async function clearPersistedCredentials(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
