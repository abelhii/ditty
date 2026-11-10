// Outlives `jest.resetModules()`, standing in for the on-disk store across a simulated relaunch.
const mockData = new Map<string, string>();
jest.mock('@/api/kv-storage', () => ({
  getItem: (key: string) => mockData.get(key) ?? null,
  setItem: (key: string, value: string) => void mockData.set(key, value),
  removeItem: (key: string) => void mockData.delete(key),
}));

/* eslint-disable @typescript-eslint/no-require-imports -- modules are re-required after `jest.resetModules()` to simulate a relaunch. */
const KEY = 'music-player-theme-preference';

describe('useThemePreferenceStore', () => {
  beforeEach(() => {
    mockData.clear();
    jest.resetModules();
  });

  it('defaults to following the system', () => {
    const { useThemePreferenceStore } = require('@/hooks/use-theme-preference-store');
    expect(useThemePreferenceStore.getState().preference).toBe('system');
  });

  it('persists a choice and restores it on the next launch', () => {
    const first = require('@/hooks/use-theme-preference-store');
    first.useThemePreferenceStore.getState().setPreference('dark');
    const { getItem } = require('@/api/kv-storage');
    expect(JSON.parse(getItem(KEY) as string).state.preference).toBe('dark');

    jest.resetModules();
    const second = require('@/hooks/use-theme-preference-store');
    expect(second.useThemePreferenceStore.getState().preference).toBe('dark');
  });
});
