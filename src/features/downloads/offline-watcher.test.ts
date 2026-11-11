import { isStateOffline } from '@/features/downloads/offline-watcher';

jest.mock('expo-network', () => ({}));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

describe('isStateOffline', () => {
  it('is offline when the internet is explicitly unreachable', () => {
    expect(isStateOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
  });

  it('is offline when explicitly not connected', () => {
    expect(isStateOffline({ isConnected: false, isInternetReachable: undefined })).toBe(true);
  });

  it('is online when connected and reachable', () => {
    expect(isStateOffline({ isConnected: true, isInternetReachable: true })).toBe(false);
  });

  it('does not claim offline when readings are undefined', () => {
    expect(isStateOffline({ isConnected: undefined, isInternetReachable: undefined })).toBe(false);
  });
});
