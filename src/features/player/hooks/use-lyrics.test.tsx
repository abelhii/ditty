import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { getOpenSubsonicExtensions } from '@/api/subsonic/endpoints/lyrics';
import { useAuthStore } from '@/auth/use-auth-store';
import { useLyricsSupported } from '@/features/player/hooks/use-lyrics';

jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));
jest.mock('@/api/subsonic/endpoints/lyrics', () => ({
  getOpenSubsonicExtensions: jest.fn(),
  getLyricsBySongId: jest.fn(),
}));

const getExtensions = getOpenSubsonicExtensions as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  getExtensions.mockReset();
  useAuthStore.setState({
    credentials: { serverUrl: 'https://x', username: 'alice', salt: 's', token: 't' },
  });
});

describe('useLyricsSupported', () => {
  it('is true when the server advertises songLyrics', async () => {
    getExtensions.mockResolvedValue(['transcodeOffset', 'songLyrics']);
    const { result } = await renderHook(() => useLyricsSupported(), { wrapper });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is false for a server without the extension', async () => {
    getExtensions.mockResolvedValue(['transcodeOffset']);
    const { result } = await renderHook(() => useLyricsSupported(), { wrapper });

    await waitFor(() => expect(getExtensions).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('is false while loading, when the check fails, and when signed out', async () => {
    getExtensions.mockRejectedValue(new Error('unreachable'));
    const { result } = await renderHook(() => useLyricsSupported(), { wrapper });
    expect(result.current).toBe(false);
    await waitFor(() => expect(getExtensions).toHaveBeenCalled());
    expect(result.current).toBe(false);

    useAuthStore.setState({ credentials: null });
    getExtensions.mockClear();
    const signedOut = await renderHook(() => useLyricsSupported(), { wrapper });
    expect(signedOut.result.current).toBe(false);
    expect(getExtensions).not.toHaveBeenCalled();
  });
});
