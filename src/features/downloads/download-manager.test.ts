import { SubsonicApiError, SubsonicNetworkError } from '@/api/subsonic/errors';
import type { Track } from '@/api/types';
import { createDownloadManager } from '@/features/downloads/download-manager';
import type {
  DownloadContext,
  DownloadItem,
  DownloadManagerDeps,
} from '@/features/downloads/download-manager';
import type { DownloadRecord } from '@/features/downloads/download-rows';

function track(id: string, coverArtId?: string): Track {
  return { id, title: id, artist: 'A', album: 'B', duration: 100, starred: false, suffix: 'flac', coverArtId };
}

const context: DownloadContext = {
  server: 'srv',
  serverUrl: 'https://x',
  auth: { username: 'u', token: 't', salt: 's' },
};

type Gate = { resolve: (bytes: number) => void; reject: (e: unknown) => void; url: string; signal: AbortSignal };

/** Fake fetch that parks every call until the test resolves/rejects it. */
function harness(overrides: Partial<DownloadManagerDeps> = {}) {
  const gates: Gate[] = [];
  const saved: DownloadRecord[] = [];
  const items = new Map<string, DownloadItem | null>();
  const deleted: string[] = [];
  const memberships: string[] = [];
  const onAuthError = jest.fn();
  const notifyFailures = jest.fn();
  let ctx: DownloadContext | null = context;

  const deps: DownloadManagerDeps = {
    concurrency: 2,
    maxAttempts: 3,
    sleep: () => Promise.resolve(),
    getContext: () => ctx,
    audioUri: (_c, t) => `file:///d/${t.id}.flac`,
    coverUri: (_c, id) => `file:///d/cover-${id}.jpg`,
    audioUrl: (_c, t) => `audio:${t.id}`,
    coverUrl: (_c, id) => `cover:${id}`,
    fetchFile: (url, _dest, { signal }) =>
      new Promise<number>((resolve, reject) => {
        gates.push({ resolve, reject, url, signal });
        signal.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      }),
    deleteFile: (uri) => deleted.push(uri),
    getDownload: (_s, id) => saved.find((r) => r.track.id === id) ?? null,
    saveDownload: (_s, r) => saved.push(r),
    addMembership: (_s, kind, cid, t) => memberships.push(`${kind}:${cid}:${t.id}`),
    setItem: (id, item) => items.set(id, item),
    onAuthError,
    notifyFailures,
    ...overrides,
  };
  return {
    manager: createDownloadManager(deps),
    gates,
    saved,
    items,
    deleted,
    memberships,
    onAuthError,
    notifyFailures,
    setContext: (c: DownloadContext | null) => (ctx = c),
  };
}

const flush = () => new Promise<void>((r) => setImmediate(r));

describe('download manager', () => {
  it('respects the concurrency limit and starts the next job when one finishes', async () => {
    const h = harness();
    h.manager.enqueue('album', 'al1', [track('a'), track('b'), track('c')]);
    await flush();
    expect(h.gates.map((g) => g.url)).toEqual(['audio:a', 'audio:b']);
    expect(h.items.get('c')?.status).toBe('queued');

    h.gates[0].resolve(10);
    await flush();
    expect(h.gates.map((g) => g.url)).toEqual(['audio:a', 'audio:b', 'audio:c']);
    expect(h.saved.map((r) => r.track.id)).toEqual(['a']);
    expect(h.items.get('a')).toBeNull();
  });

  it('records membership and skips tracks already downloaded', async () => {
    const h = harness();
    h.manager.enqueue('album', 'al1', [track('a')]);
    await flush();
    h.gates[0].resolve(10);
    await flush();

    h.manager.enqueue('playlist', 'pl1', [track('a')]);
    await flush();
    expect(h.gates).toHaveLength(1);
    expect(h.memberships).toEqual(['album:al1:a', 'playlist:pl1:a']);
  });

  it('does not queue a track that is already queued or active', async () => {
    const h = harness();
    h.manager.enqueue('album', 'al1', [track('a')]);
    h.manager.enqueue('album', 'al1', [track('a')]);
    await flush();
    expect(h.gates).toHaveLength(1);
  });

  it('downloads cover art with the track and saves its path', async () => {
    const h = harness();
    h.manager.enqueue('track', 'a', [track('a', 'cov1')]);
    await flush();
    h.gates[0].resolve(500);
    await flush();
    expect(h.gates[1].url).toBe('cover:cov1');
    h.gates[1].resolve(5);
    await flush();
    expect(h.saved[0]).toMatchObject({ filePath: 'file:///d/a.flac', coverPath: 'file:///d/cover-cov1.jpg', sizeBytes: 500 });
  });

  it('still saves the track when cover art fails', async () => {
    const h = harness({ maxAttempts: 1 });
    h.manager.enqueue('track', 'a', [track('a', 'cov1')]);
    await flush();
    h.gates[0].resolve(500);
    await flush();
    h.gates[1].reject(new SubsonicNetworkError('x'));
    await flush();
    expect(h.saved[0].coverPath).toBeNull();
  });

  it('retries network errors with cleanup, then succeeds', async () => {
    const h = harness();
    h.manager.enqueue('track', 'a', [track('a')]);
    await flush();
    h.gates[0].reject(new SubsonicNetworkError('x'));
    await flush();
    expect(h.deleted).toEqual(['file:///d/a.flac']);
    expect(h.gates).toHaveLength(2);
    h.gates[1].resolve(7);
    await flush();
    expect(h.saved).toHaveLength(1);
  });

  it('fails after maxAttempts, removes the partial file, and notifies once on drain', async () => {
    const h = harness({ maxAttempts: 2 });
    h.manager.enqueue('album', 'al', [track('a'), track('b')]);
    await flush();
    for (let i = 0; i < 4; i++) {
      h.gates[i]?.reject(new SubsonicNetworkError('x'));
      await flush();
    }
    expect(h.items.get('a')?.status).toBe('failed');
    expect(h.items.get('b')?.status).toBe('failed');
    expect(h.saved).toHaveLength(0);
    expect(h.notifyFailures).toHaveBeenCalledTimes(1);
    expect(h.notifyFailures).toHaveBeenCalledWith(2);
  });

  it('cancels a queued job without ever fetching it', async () => {
    const h = harness({ concurrency: 1 });
    h.manager.enqueue('album', 'al', [track('a'), track('b')]);
    await flush();
    h.manager.cancel('b');
    expect(h.items.get('b')).toBeNull();
    h.gates[0].resolve(1);
    await flush();
    expect(h.gates).toHaveLength(1);
  });

  it('cancels an active job, cleans the partial file, and does not notify a failure', async () => {
    const h = harness();
    h.manager.enqueue('track', 'a', [track('a')]);
    await flush();
    h.manager.cancel('a');
    await flush();
    expect(h.deleted).toEqual(['file:///d/a.flac']);
    expect(h.items.get('a')).toBeNull();
    expect(h.saved).toHaveLength(0);
    expect(h.notifyFailures).not.toHaveBeenCalled();
  });

  it('parks the queue on an auth error, routes to re-auth, and resumes with the new context', async () => {
    const h = harness({ concurrency: 1 });
    h.manager.enqueue('album', 'al', [track('a'), track('b')]);
    await flush();
    h.gates[0].reject(new SubsonicApiError(40));
    await flush();
    expect(h.onAuthError).toHaveBeenCalledTimes(1);
    expect(h.items.get('a')?.status).toBe('failed');
    expect(h.gates).toHaveLength(1); // b not started
    expect(h.notifyFailures).not.toHaveBeenCalled();

    h.setContext({ ...context, auth: { username: 'u', token: 'new', salt: 's2' } });
    h.manager.resume();
    await flush();
    expect(h.gates).toHaveLength(2);
    expect(h.gates[1].url).toBe('audio:b');
    h.gates[1].resolve(3);
    await flush();
    expect(h.saved.map((r) => r.track.id)).toEqual(['b']);
  });

  it('does nothing when there is no signed-in context', async () => {
    const h = harness();
    h.setContext(null);
    h.manager.enqueue('track', 'a', [track('a')]);
    await flush();
    expect(h.gates).toHaveLength(0);
    expect(h.memberships).toHaveLength(0);
  });

  it('handles an empty track list', async () => {
    const h = harness();
    h.manager.enqueue('album', 'al', []);
    await flush();
    expect(h.gates).toHaveLength(0);
  });
});
