import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { HomeScreen } from '@/features/home/components/HomeScreen';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/use-is-wide-layout', () => ({ useIsWideLayout: () => false }));
jest.mock('@/hooks/use-list-bottom-inset', () => ({ useListBottomInset: () => 0 }));
jest.mock('@/features/playlists/hooks/use-playlists', () => ({
  usePlaylists: () => ({ data: [] }),
}));
jest.mock('@/features/home/components/HomeHeader', () => ({ HomeHeader: () => null }));
jest.mock('@/features/home/components/AlbumShelf', () => ({ AlbumShelf: () => null }));
jest.mock('@/features/home/components/MostPlayedTracks', () => ({ MostPlayedTracks: () => null }));
jest.mock('@/features/home/components/UnheardTracks', () => ({ UnheardTracks: () => null }));
jest.mock('@/features/home/components/WideHome', () => ({ WideHome: () => null }));

describe('HomeScreen (narrow)', () => {
  it('opens My Music from the See all link', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('link', { name: 'See all in My Music' }));
    expect(mockPush).toHaveBeenCalledWith('/home/my-music');
  });
});
