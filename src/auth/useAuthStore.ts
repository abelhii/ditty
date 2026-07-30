import { create } from 'zustand';

import { queryClient } from '@/api/queryClient';
import { computeToken, generateSalt, normalizeServerUrl, ping } from '@/api/subsonic/client';
import {
  clearPersistedCredentials,
  readPersistedCredentials,
  writePersistedCredentials,
} from '@/auth/credentialStorage';
import { usePlayerStore } from '@/player/usePlayerStore';

/** Everything needed to sign future requests. The plaintext password is never part of this. */
type StoredCredentials = {
  serverUrl: string;
  username: string;
  salt: string;
  token: string;
};

type AuthStatus = 'hydrating' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  credentials: StoredCredentials | null;
  error: string | null;
  /** Reads persisted credentials on app launch. Call once, before rendering the auth gate. */
  hydrate: () => Promise<void>;
  /** Validates credentials against the server, then persists only the resulting salt+token. */
  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'hydrating',
  credentials: null,
  error: null,

  hydrate: async () => {
    const raw = await readPersistedCredentials();
    if (!raw) {
      set({ status: 'unauthenticated' });
      return;
    }

    try {
      const credentials: StoredCredentials = JSON.parse(raw);
      set({ status: 'authenticated', credentials });
    } catch {
      // Corrupt storage — treat as logged out rather than crashing the app.
      await clearPersistedCredentials();
      set({ status: 'unauthenticated' });
    }
  },

  login: async (serverUrlInput, username, password) => {
    set({ error: null });

    try {
      const serverUrl = normalizeServerUrl(serverUrlInput);
      const salt = await generateSalt();
      const token = await computeToken(password, salt);

      // Validate before persisting anything — never store a salt/token pair that doesn't work.
      await ping(serverUrl, { username, token, salt });

      const credentials: StoredCredentials = { serverUrl, username, salt, token };
      await writePersistedCredentials(JSON.stringify(credentials));
      set({ status: 'authenticated', credentials, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      set({ status: 'unauthenticated', credentials: null, error: message });
      throw err;
    }
  },

  logout: async () => {
    await clearPersistedCredentials();
    // Cache keys aren't scoped by server/user, so a second account would otherwise see the
    // first account's cached library until every query happened to refetch.
    queryClient.clear();
    // The persisted queue holds server-specific track ids (ADR 0006) — drop it (and stop
    // playback) so the next account never inherits this one's queue.
    usePlayerStore.getState().reset();
    usePlayerStore.persist.clearStorage();
    set({ status: 'unauthenticated', credentials: null, error: null });
  },
}));
