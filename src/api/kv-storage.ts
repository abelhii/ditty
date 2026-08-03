import Storage from 'expo-sqlite/kv-store';

/**
 * The app's one general-purpose synchronous key-value store — used to persist the TanStack
 * Query cache (see query-client.ts) and anything else that needs simple local durability
 * (recent searches, settings). Native implementation: expo-sqlite/kv-store (first-party, sync
 * API). See kvStorage.web.ts for the web counterpart — split into a platform-specific file
 * (Metro convention) rather than an inline Platform.OS branch, because expo-sqlite's web build
 * pulls in a wa-sqlite.wasm asset that Metro's web bundler can't resolve without extra config;
 * a runtime branch alone doesn't keep that import out of the web bundle.
 */
export function getItem(key: string): string | null {
  return Storage.getItemSync(key);
}

export function setItem(key: string, value: string): void {
  Storage.setItemSync(key, value);
}

export function removeItem(key: string): void {
  Storage.removeItemSync(key);
}
