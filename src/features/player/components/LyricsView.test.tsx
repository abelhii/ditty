import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { getLyricsBySongId } from '@/api/subsonic/endpoints/lyrics';
import type { Lyrics } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { LyricsView } from '@/features/player/components/LyricsView';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));
jest.mock('@/api/subsonic/endpoints/lyrics', () => ({ getLyricsBySongId: jest.fn() }));

const getLyrics = getLyricsBySongId as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const unsynced: Lyrics = { synced: false, offsetMs: 0, lines: [{ text: 'First line' }, { text: 'Second line' }] };
const synced: Lyrics = {
  synced: true,
  offsetMs: 0,
  lines: [
    { text: 'Alpha', startMs: 1000 },
    { text: 'Beta', startMs: 5000 },
  ],
};

beforeEach(() => {
  getLyrics.mockReset();
  useAuthStore.setState({
    credentials: { serverUrl: 'https://x', username: 'alice', salt: 's', token: 't' },
  });
  usePlaybackStatusStore.setState({ position: 0 });
});

describe('LyricsView', () => {
  it('shows a loading indicator while fetching', async () => {
    getLyrics.mockReturnValue(new Promise(() => {}));
    await render(<LyricsView trackId="a" />, { wrapper });

    expect(screen.queryByText('No lyrics for this track.')).toBeNull();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('shows an empty state, not an error, when the Track has no lyrics', async () => {
    getLyrics.mockResolvedValue(null);
    await render(<LyricsView trackId="a" />, { wrapper });

    expect(await screen.findByText('No lyrics for this track.')).toBeTruthy();
    expect(screen.queryByText("Couldn't load lyrics.")).toBeNull();
  });

  it('shows an error with Retry that refetches', async () => {
    getLyrics.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(unsynced);
    await render(<LyricsView trackId="a" />, { wrapper });

    expect(await screen.findByText("Couldn't load lyrics.")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('First line')).toBeTruthy();
  });

  it('renders unsynced lyrics as plain text with no highlight', async () => {
    getLyrics.mockResolvedValue(unsynced);
    await render(<LyricsView trackId="a" />, { wrapper });

    expect(await screen.findByText('First line')).toBeTruthy();
    expect(screen.getByText('Second line')).toBeTruthy();
  });

  it('highlights the synced line at the playback position and moves on as it advances', async () => {
    getLyrics.mockResolvedValue(synced);
    await render(<LyricsView trackId="a" />, { wrapper });
    await screen.findByText('Alpha');

    expect(screen.getByText('Alpha').props.accessibilityState).toEqual({ selected: false });

    await act(async () => usePlaybackStatusStore.setState({ position: 2 }));
    expect(screen.getByText('Alpha').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText('Beta').props.accessibilityState).toEqual({ selected: false });

    await act(async () => usePlaybackStatusStore.setState({ position: 5.5 }));
    expect(screen.getByText('Alpha').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByText('Beta').props.accessibilityState).toEqual({ selected: true });
  });
});
