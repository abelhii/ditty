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
  let store!: typeof import('@/player/use-stream-quality-store').useStreamQualityStore;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance re-runs persist hydration against mockStore
    store = require('@/player/use-stream-quality-store').useStreamQualityStore;
  });
  return store;
}

beforeEach(() => {
  mockStore = {};
});

describe('useStreamQualityStore', () => {
  it('defaults to original', () => {
    expect(loadStore().getState().quality).toBe('original');
  });

  it('persists the chosen quality across a reload', () => {
    loadStore().getState().setQuality('low');
    expect(loadStore().getState().quality).toBe('low');
  });
});
