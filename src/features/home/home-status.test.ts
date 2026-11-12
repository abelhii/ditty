import { homeStatus, type ShelfResult } from '@/features/home/home-status';

const ok = (data: unknown[]): ShelfResult => ({ isLoading: false, error: null, data });
const failed = (error: unknown): ShelfResult => ({ isLoading: false, error, data: undefined });
const loading: ShelfResult = { isLoading: true, error: null, data: undefined };

describe('homeStatus', () => {
  it('is loading while any Shelf is loading', () => {
    expect(homeStatus([loading, failed(new Error('x'))])).toEqual({ kind: 'loading' });
  });

  it('is ready when at least one Shelf has albums, even if others failed', () => {
    expect(homeStatus([failed(new Error('x')), ok([1]), ok([])])).toEqual({ kind: 'ready' });
  });

  it('is failed, with the error, when nothing has content and a Shelf errored', () => {
    const error = new Error('boom');
    expect(homeStatus([ok([]), failed(error)])).toEqual({ kind: 'failed', error });
  });

  it('is empty when every Shelf came back empty', () => {
    expect(homeStatus([ok([]), ok([]), ok([])])).toEqual({ kind: 'empty' });
  });

  it('treats a Shelf with no data and no error as empty', () => {
    expect(homeStatus([{ isLoading: false, error: null, data: undefined }])).toEqual({ kind: 'empty' });
  });
});
