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

const KEY = 'music-player-auto-dj-settings';

function loadStores() {
  let settings!: typeof import('@/player/use-auto-dj-settings-store').useAutoDjSettingsStore;
  let session!: typeof import('@/player/use-auto-dj-store').useAutoDjStore;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instances re-run persist hydration against mockStore
    settings = require('@/player/use-auto-dj-settings-store').useAutoDjSettingsStore;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- same registry, so the session store sees these settings
    session = require('@/player/use-auto-dj-store').useAutoDjStore;
  });
  return { settings, session };
}

beforeEach(() => {
  mockStore = {};
});

describe('useAutoDjSettingsStore', () => {
  it('starts with the defaults', () => {
    const { settings } = loadStores();
    expect(settings.getState()).toMatchObject({ enabledByDefault: false, randomness: 30, source: 'mixed' });
  });

  it('persists changes and restores them on the next load', () => {
    const { settings } = loadStores();
    settings.getState().setSource('genre');
    settings.getState().setRandomness(60);
    settings.getState().setEnabledByDefault(true);

    const reloaded = loadStores();
    expect(reloaded.settings.getState()).toMatchObject({ enabledByDefault: true, randomness: 60, source: 'genre' });
    expect(reloaded.session.getState().enabled).toBe(true);
  });

  it('clamps randomness to 0..100', () => {
    const { settings } = loadStores();
    settings.getState().setRandomness(250);
    expect(settings.getState().randomness).toBe(100);
    settings.getState().setRandomness(-5);
    expect(settings.getState().randomness).toBe(0);
  });

  it('reset restores defaults and clearStorage removes the saved blob', () => {
    const { settings } = loadStores();
    settings.getState().setSource('random');
    expect(mockStore[KEY]).toBeDefined();
    settings.getState().reset();
    settings.persist.clearStorage();
    expect(settings.getState().source).toBe('mixed');
    expect(mockStore[KEY]).toBeUndefined();
  });

  it('falls back to defaults when the saved blob is corrupt', () => {
    mockStore[KEY] = '{not json';
    const { settings } = loadStores();
    expect(settings.getState().source).toBe('mixed');
  });
});
