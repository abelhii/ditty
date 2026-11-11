import { isOfflineMode, useOfflineStore } from '@/features/downloads/use-offline-store';

jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

beforeEach(() => useOfflineStore.setState({ manual: false, deviceOffline: false }));

describe('isOfflineMode', () => {
  it('is off when neither flag is set', () => {
    expect(isOfflineMode({ manual: false, deviceOffline: false })).toBe(false);
  });

  it('is on for either flag alone', () => {
    expect(isOfflineMode({ manual: true, deviceOffline: false })).toBe(true);
    expect(isOfflineMode({ manual: false, deviceOffline: true })).toBe(true);
  });
});

describe('useOfflineStore', () => {
  it('keeps a manual choice when the device comes back online', () => {
    useOfflineStore.getState().setManual(true);
    useOfflineStore.getState().setDeviceOffline(true);
    useOfflineStore.getState().setDeviceOffline(false);
    expect(isOfflineMode(useOfflineStore.getState())).toBe(true);
  });
});
