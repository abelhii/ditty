import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MyMusicScreen } from '@/features/playlists/components/MyMusicScreen';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

const loadedQuery = (data: unknown) => ({
  isLoading: false,
  isError: false,
  isFetching: false,
  error: null,
  data,
  refetch: () => {},
});

jest.mock('@/features/downloads/components/CollectionRowDownload', () => ({
  CollectionRowDownload: () => null,
}));
jest.mock('@/features/playlists/hooks/use-playlists', () => ({
  usePlaylists: () => loadedQuery([{ id: 'p1', name: 'Mix', songCount: 3 }]),
}));
jest.mock('@/features/favourites/hooks/use-favourites', () => ({
  useFavourites: () => loadedQuery({ albums: [], artists: [], songs: [] }),
}));
jest.mock('@/features/playlists/hooks/use-create-playlist', () => ({
  useCreatePlaylist: () => ({ mutate: () => {} }),
}));

describe('MyMusicScreen basePath', () => {
  beforeEach(() => mockPush.mockClear());

  it('opens a playlist in its own stack by default', async () => {
    await render(<MyMusicScreen />);
    await fireEvent.press(screen.getByText('Mix'));
    expect(mockPush).toHaveBeenCalledWith('/my-music/playlist/p1');
  });

  it('opens a playlist in the Home stack when mounted there', async () => {
    await render(<MyMusicScreen basePath="/home" />);
    await fireEvent.press(screen.getByText('Mix'));
    expect(mockPush).toHaveBeenCalledWith('/home/playlist/p1');
  });
});

describe('MyMusicScreen chips', () => {
  it('marks only the selected chip as selected', async () => {
    await render(<MyMusicScreen />);

    expect(screen.getByRole('button', { name: 'Playlists', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Albums', selected: false })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Albums' }));

    expect(screen.getByRole('button', { name: 'Albums', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Playlists', selected: false })).toBeTruthy();
  });

  it('gives the New playlist button a button role', async () => {
    await render(<MyMusicScreen />);

    expect(screen.getByRole('button', { name: 'New playlist' })).toBeTruthy();
  });
});
