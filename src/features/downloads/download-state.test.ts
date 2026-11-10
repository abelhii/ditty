import { collectionDownloadState, trackDownloadState } from '@/features/downloads/download-state';

describe('trackDownloadState', () => {
  it('is idle for an unknown track', () => {
    expect(trackDownloadState({}, {}, 'a')).toEqual({ kind: 'idle', progress: 0 });
  });

  it('is downloaded when flagged', () => {
    expect(trackDownloadState({}, { a: true }, 'a')).toEqual({ kind: 'downloaded', progress: 1 });
  });

  it('prefers an in-flight item over a stale downloaded flag', () => {
    const items = { a: { status: 'downloading' as const, progress: 0.4 } };
    expect(trackDownloadState(items, { a: true }, 'a')).toEqual({ kind: 'downloading', progress: 0.4 });
  });

  it('reports failed and queued items', () => {
    const items = {
      a: { status: 'failed' as const, progress: 0 },
      b: { status: 'queued' as const, progress: 0 },
    };
    expect(trackDownloadState(items, {}, 'a').kind).toBe('failed');
    expect(trackDownloadState(items, {}, 'b').kind).toBe('queued');
  });
});

describe('collectionDownloadState', () => {
  it('is idle for an empty collection', () => {
    expect(collectionDownloadState({}, {}, [])).toEqual({ kind: 'idle', progress: 0 });
  });

  it('is downloaded only when every track is', () => {
    expect(collectionDownloadState({}, { a: true, b: true }, ['a', 'b']).kind).toBe('downloaded');
    expect(collectionDownloadState({}, { a: true }, ['a', 'b']).kind).toBe('idle');
  });

  it('averages progress over the whole collection, counting finished tracks as done', () => {
    const items = { b: { status: 'downloading' as const, progress: 0.5 }, c: { status: 'queued' as const, progress: 0 } };
    const state = collectionDownloadState(items, { a: true }, ['a', 'b', 'c']);
    expect(state.kind).toBe('downloading');
    expect(state.progress).toBeCloseTo(0.5);
  });

  it('is failed when nothing is running and a track failed', () => {
    const items = { b: { status: 'failed' as const, progress: 0 } };
    expect(collectionDownloadState(items, { a: true }, ['a', 'b']).kind).toBe('failed');
  });

  it('keeps downloading while any track is still active even if another failed', () => {
    const items = {
      b: { status: 'failed' as const, progress: 0 },
      c: { status: 'downloading' as const, progress: 0.2 },
    };
    expect(collectionDownloadState(items, {}, ['b', 'c']).kind).toBe('downloading');
  });
});
