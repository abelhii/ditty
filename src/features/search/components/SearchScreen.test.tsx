import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SearchScreen } from '@/features/search/components/SearchScreen';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: jest.fn() }) }));
jest.mock('@/hooks/use-is-wide-layout', () => ({ useIsWideLayout: () => false }));
jest.mock('@/hooks/use-list-bottom-inset', () => ({ useListBottomInset: () => 0 }));
jest.mock('@/auth/use-auth-store', () => ({
  useAuthStore: (select: (s: unknown) => unknown) =>
    select({ credentials: { serverUrl: 'http://s', username: 'u', token: 't', salt: 's' } }),
}));
jest.mock('@/api/subsonic/endpoints/media', () => ({
  ...jest.requireActual('@/api/subsonic/endpoints/media'),
  getCoverArtUrl: () => 'http://cover',
}));
jest.mock('@/components/TrackActionsMenu', () => ({ TrackActionsMenu: () => null }));
jest.mock('@/features/downloads/components/DownloadBadge', () => ({ DownloadBadge: () => null }));
jest.mock('@/player/PlaybackController', () => ({ playNow: jest.fn() }));
jest.mock('@/features/search/hooks/use-recent-searches', () => ({
  useRecentSearches: () => ({ recents: [], add: jest.fn(), remove: jest.fn(), clear: jest.fn() }),
}));

let mockTerm = 'trip';
let mockIsActive = true;
let mockResults = {
  artists: [{ id: 'a1', name: 'Trip Artist', albumCount: 1 }],
  albums: [{ id: 'al1', name: 'Trip Album', artist: 'Trip Artist' }],
  tracks: [{ id: 't1', title: 'Trip Song', artist: 'Trip Artist' }],
};
jest.mock('@/features/search/hooks/use-search', () => ({
  useSearch: () => ({
    term: mockTerm,
    isActive: mockIsActive,
    query: {
      isLoading: false,
      isError: false,
      error: null,
      data: mockResults,
      refetch: () => {},
    },
  }),
}));
jest.mock('@/features/playlists/hooks/use-playlists', () => ({
  usePlaylists: () => ({ data: [{ id: 'p1', name: 'Road Trip', songCount: 1 }] }),
}));

describe('SearchScreen filters', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockTerm = 'trip';
    mockIsActive = true;
    mockResults = {
      artists: [{ id: 'a1', name: 'Trip Artist', albumCount: 1 }],
      albums: [{ id: 'al1', name: 'Trip Album', artist: 'Trip Artist' }],
      tracks: [{ id: 't1', title: 'Trip Song', artist: 'Trip Artist' }],
    };
  });

  it('shows every type with type labels and a total count under All', async () => {
    await render(<SearchScreen />);

    expect(screen.getByText('4 results')).toBeTruthy();
    expect(screen.getByText('Song · Trip Artist')).toBeTruthy();
    expect(screen.getByText('Album · Trip Artist')).toBeTruthy();
    expect(screen.getByText('Playlist · 1 song')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All', selected: true })).toBeTruthy();
  });

  it('narrows the list and count to the chosen chip', async () => {
    await render(<SearchScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Playlists' }));

    expect(screen.getByText('1 result')).toBeTruthy();
    expect(screen.getByText('Road Trip')).toBeTruthy();
    expect(screen.queryByText('Trip Song')).toBeNull();
    expect(screen.queryByText('Trip Album')).toBeNull();
  });

  it('shows an in-place empty message when the chosen chip has no matches', async () => {
    mockResults = { ...mockResults, artists: [] };
    await render(<SearchScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Artists' }));

    expect(screen.getByText('0 results')).toBeTruthy();
    expect(screen.getByText('No results for "trip" here.')).toBeTruthy();
  });

  it('resets to All when the settled term changes', async () => {
    const view = await render(<SearchScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Songs' }));
    expect(screen.getByRole('button', { name: 'Songs', selected: true })).toBeTruthy();

    mockTerm = 'road';
    await view.rerender(<SearchScreen />);

    expect(screen.getByRole('button', { name: 'All', selected: true })).toBeTruthy();
  });

  it('opens a matching Playlist in the Search stack', async () => {
    await render(<SearchScreen />);
    await fireEvent.press(screen.getByText('Road Trip'));

    expect(mockPush).toHaveBeenCalledWith('/search/playlist/p1');
  });

  it('shows no chips when the box is empty', async () => {
    mockIsActive = false;
    mockTerm = '';
    await render(<SearchScreen />);

    expect(screen.queryByRole('button', { name: 'Playlists' })).toBeNull();
  });
});
