import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  clearPersistedCredentials,
  readPersistedCredentials,
  writePersistedCredentials,
} from '@/auth/credential-storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function withPlatform(os: typeof Platform.OS, fn: () => Promise<void>) {
  const original = Platform.OS;
  Platform.OS = os;
  return fn().finally(() => {
    Platform.OS = original;
  });
}

describe('credentialStorage on native (iOS/Android)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads through expo-secure-store', async () =>
    withPlatform('ios', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-value');
      await expect(readPersistedCredentials()).resolves.toBe('stored-value');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('subsonic-auth');
    }));

  it('writes through expo-secure-store', async () =>
    withPlatform('android', async () => {
      await writePersistedCredentials('{"a":1}');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('subsonic-auth', '{"a":1}');
    }));

  it('clears through expo-secure-store', async () =>
    withPlatform('ios', async () => {
      await clearPersistedCredentials();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('subsonic-auth');
    }));
});

describe('credentialStorage on web', () => {
  const store = new Map<string, string>();

  beforeAll(() => {
    // jsdom (used for RN component tests) doesn't implement localStorage by default.
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
      writable: true,
    });
  });

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('reads/writes/clears through localStorage instead of expo-secure-store', async () =>
    withPlatform('web', async () => {
      await expect(readPersistedCredentials()).resolves.toBeNull();

      await writePersistedCredentials('{"a":1}');
      await expect(readPersistedCredentials()).resolves.toBe('{"a":1}');

      await clearPersistedCredentials();
      await expect(readPersistedCredentials()).resolves.toBeNull();

      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    }));
});
