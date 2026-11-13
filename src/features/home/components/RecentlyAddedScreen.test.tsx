import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Album, Playlist } from '@/api/types';
import { RecentlyAddedScreen } from '@/features/home/components/RecentlyAddedScreen';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/use-is-wide-layout', () => ({ useIsWideLayout: () => false }));
jest.mock('@/hooks/use-list-bottom-inset', () => ({ useListBottomInset: () => 0 }));
jest.mock('@/components/CoverArtImage', () => ({ CoverArtImage: () => null }));

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const mockAlbums: Album[] = [
  { id: 'a1', name: 'Fresh Album', artist: 'Artist', songCount: 1, duration: 1, starred: false, created: daysAgo(2) },
  { id: 'a2', name: 'Old Album', artist: 'Artist', songCount: 1, duration: 1, starred: false, created: daysAgo(90) },
];
const mockPlaylists: Playlist[] = [
  { id: 'p1', name: 'Fresh Playlist', isPublic: false, songCount: 1, duration: 1, created: daysAgo(1) },
];

let mockHasNextPage = false;
jest.mock('@/features/home/hooks/use-recently-added-albums', () => ({
  useRecentlyAddedAlbums: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    isFetchingNextPage: false,
    error: null,
    data: { pages: [mockAlbums] },
    hasNextPage: mockHasNextPage,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  }),
}));
jest.mock('@/features/playlists/hooks/use-playlists', () => ({
  usePlaylists: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    data: mockPlaylists,
    refetch: jest.fn(),
  }),
}));

describe('RecentlyAddedScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockHasNextPage = false;
  });

  it('shows albums and playlists under recency headings with type captions', async () => {
    await render(<RecentlyAddedScreen />);

    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Earlier')).toBeTruthy();
    expect(screen.getByText('Fresh Album')).toBeTruthy();
    expect(screen.getByText('Fresh Playlist')).toBeTruthy();
    expect(screen.getByText('Album · Added 2 days ago')).toBeTruthy();
    expect(screen.getByText('Playlist · Added yesterday')).toBeTruthy();
  });

  it('filters by type with the chips', async () => {
    await render(<RecentlyAddedScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Playlists' }));
    expect(screen.getByText('Fresh Playlist')).toBeTruthy();
    expect(screen.queryByText('Fresh Album')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Albums' }));
    expect(screen.getByText('Fresh Album')).toBeTruthy();
    expect(screen.queryByText('Fresh Playlist')).toBeNull();
  });

  it('opens the tapped item', async () => {
    await render(<RecentlyAddedScreen />);

    await fireEvent.press(screen.getByText('Fresh Album'));
    expect(mockPush).toHaveBeenCalledWith('/home/album/a1');

    await fireEvent.press(screen.getByText('Fresh Playlist'));
    expect(mockPush).toHaveBeenCalledWith('/home/playlist/p1');
  });

  it('holds back playlists older than the oldest loaded album while more album pages remain', async () => {
    mockHasNextPage = true;
    mockPlaylists.push({ id: 'p2', name: 'Ancient Playlist', isPublic: false, songCount: 1, duration: 1, created: daysAgo(400) });
    try {
      await render(<RecentlyAddedScreen />);
      expect(screen.queryByText('Ancient Playlist')).toBeNull();
      expect(screen.getByText('Old Album')).toBeTruthy();
    } finally {
      mockPlaylists.pop();
    }
  });
});
