import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import { SubsonicApiError, SubsonicHttpError, SubsonicNetworkError } from '@/api/subsonic/errors';
import { useAuthStore } from '@/auth/use-auth-store';
import { getDownloadedAlbum } from '@/features/downloads/downloads-runtime';
import { useOfflineStore } from '@/features/downloads/use-offline-store';
import { useAlbum } from '@/features/library/hooks/use-album';

jest.mock('@/api/subsonic/endpoints/browsing');
jest.mock('@/features/downloads/downloads-runtime', () => ({ getDownloadedAlbum: jest.fn() }));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

const getAlbumMock = getAlbum as jest.Mock;
const downloadedMock = getDownloadedAlbum as jest.Mock;
const fallback = { album: { id: 'al1', name: 'Downloaded' }, tracks: [{ id: 't1' }] };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  useOfflineStore.setState({ manual: false, deviceOffline: false });
  useAuthStore.setState({
    credentials: { serverUrl: 'https://x', username: 'u', token: 't', salt: 's' },
  } as never);
  downloadedMock.mockReturnValue(fallback);
});

describe('useAlbum downloaded-album fallback', () => {
  it.each([
    ['a network error', () => new SubsonicNetworkError(new Error('x'))],
    ['an HTTP 502 from a proxy', () => new SubsonicHttpError(502)],
  ])('falls back to the downloaded album on %s', async (_name, makeError) => {
    getAlbumMock.mockRejectedValue(makeError());
    const { result } = await renderHook(() => useAlbum('al1'), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(fallback));
    expect(result.current.isError).toBe(false);
  });

  it('does not fall back for a Subsonic API error (the server answered)', async () => {
    getAlbumMock.mockRejectedValue(new SubsonicApiError(70));
    const { result } = await renderHook(() => useAlbum('al1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
