import { create } from 'zustand';

import { computeToken, generateSalt, normalizeServerUrl, ping } from '@/api/subsonic/client';
import {
  clearPersistedCredentials,
  readPersistedCredentials,
  writePersistedCredentials,
} from '@/auth/credentialStorage';

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
    set({ status: 'unauthenticated', credentials: null, error: null });
  },
}));
