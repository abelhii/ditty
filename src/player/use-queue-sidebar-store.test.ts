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
  let store!: typeof import('@/player/use-queue-sidebar-store').useQueueSidebarStore;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance re-runs persist hydration against mockStore
    store = require('@/player/use-queue-sidebar-store').useQueueSidebarStore;
  });
  return store;
}

beforeEach(() => {
  mockStore = {};
});

describe('useQueueSidebarStore', () => {
  it('is expanded by default', () => {
    expect(loadStore().getState().collapsed).toBe(false);
  });

  it('toggles between collapsed and expanded', () => {
    const store = loadStore();
    store.getState().toggle();
    expect(store.getState().collapsed).toBe(true);
    store.getState().toggle();
    expect(store.getState().collapsed).toBe(false);
  });

  it('persists the collapsed state across a reload', () => {
    loadStore().getState().toggle();
    expect(loadStore().getState().collapsed).toBe(true);
  });
});
