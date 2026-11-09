import { create } from 'zustand';

import { queryClient } from '@/api/query-client';
import { computeToken, generateSalt, normalizeServerUrl, ping } from '@/api/subsonic/client';
import {
  clearPersistedCredentials,
  readPersistedCredentials,
  writePersistedCredentials,
} from '@/auth/credential-storage';
import { usePlayerStore } from '@/player/use-player-store';

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
  /** True while the server has rejected the session mid-use (token 40/41) and the blocking re-auth
   *  prompt is up. Idempotent via {@link AuthState.sessionExpired} so N concurrent rejections
   *  collapse to one modal (ADR 0007). */
  reauthRequired: boolean;
  /** Inline error shown in the re-auth prompt on a repeated rejection. */
  reauthError: string | null;
  /** Reads persisted credentials on app launch. Call once, before rendering the auth gate. */
  hydrate: () => Promise<void>;
  /** Validates credentials against the server, then persists only the resulting salt+token. */
  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Flags the session as expired — the trigger for in-place Re-authentication. Idempotent and a
   *  no-op unless currently authenticated (fired from the global QueryCache/MutationCache onError). */
  sessionExpired: () => void;
  /** Recomputes salt+token from a re-entered password (server + username already known), pings to
   *  validate, persists, clears the flag, and refetches queries — Queue/cache/nav all survive. */
  reauthenticate: (password: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'hydrating',
  credentials: null,
  error: null,
  reauthRequired: false,
  reauthError: null,

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
    set({ status: 'unauthenticated', credentials: null, error: null, reauthRequired: false, reauthError: null });
  },

  sessionExpired: () => {
    // Idempotent: collapse the N concurrent 40/41 rejections a single expired token produces into
    // one modal. Only meaningful while authenticated — ignore stray rejections during login/logout.
    const { status, reauthRequired } = get();
    if (status !== 'authenticated' || reauthRequired) return;
    set({ reauthRequired: true, reauthError: null });
  },

  reauthenticate: async (password) => {
    const credentials = get().credentials;
    if (!credentials) return;
    set({ reauthError: null });

    try {
      // Server + username are unchanged; only the salt/token pair is recomputed and re-validated.
      const salt = await generateSalt();
      const token = await computeToken(password, salt);
      await ping(credentials.serverUrl, { username: credentials.username, token, salt });

      const next: StoredCredentials = { ...credentials, salt, token };
      await writePersistedCredentials(JSON.stringify(next));
      set({ credentials: next, reauthRequired: false, reauthError: null });
      // Queue, query cache, and nav position all survive — idempotent queries refetch for free;
      // failed mutations are not auto-replayed (the user re-does that one action). See ADR 0007.
      queryClient.invalidateQueries();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Re-authentication failed.';
      set({ reauthError: message });
      throw err;
    }
  },
}));
