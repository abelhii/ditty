let mockStore: Record<string, string>;
jest.mock('@/api/kv-storage', () => ({
  getItem: (key: string) => (key in mockStore ? mockStore[key] : null),
  setItem: (key: string, value: string) => {
    mockStore[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
}));

function loadStore() {
  let store!: typeof import('@/player/use-levelling-settings-store').useLevellingSettingsStore;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance re-runs persist hydration against mockStore
    store = require('@/player/use-levelling-settings-store').useLevellingSettingsStore;
  });
  return store;
}

beforeEach(() => {
  mockStore = {};
});

describe('useLevellingSettingsStore', () => {
  it('defaults to off', () => {
    expect(loadStore().getState().mode).toBe('off');
  });

  it('persists the chosen mode across a reload', () => {
    loadStore().getState().setMode('album');
    expect(loadStore().getState().mode).toBe('album');
  });
});
