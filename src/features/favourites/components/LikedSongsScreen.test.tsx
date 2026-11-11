import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Track } from '@/api/types';
import { LikedSongsScreen } from '@/features/favourites/components/LikedSongsScreen';
import * as PlaybackController from '@/player/PlaybackController';

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
jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));
jest.mock('@/components/TrackActionsMenu', () => ({ TrackActionsMenu: () => null }));
jest.mock('@/player/PlaybackController', () => ({ play: jest.fn(), playNow: jest.fn() }));

const makeTrack = (id: string, title: string): Track => ({
  id,
  title,
  artist: 'Artist',
  album: 'Album',
  duration: 100,
  starred: true,
});
const mockTracks = [makeTrack('1', 'First'), makeTrack('2', 'Second'), makeTrack('3', 'Third')];

jest.mock('@/features/favourites/hooks/use-favourites', () => ({
  useFavourites: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    data: { albums: [], artists: [], tracks: mockTracks },
    refetch: () => {},
  }),
}));

describe('LikedSongsScreen', () => {
  it('replaces the Queue with the whole list, starting at the tapped track', async () => {
    await render(<LikedSongsScreen />);

    await fireEvent.press(screen.getByText('Second'));

    expect(PlaybackController.play).toHaveBeenCalledWith(mockTracks, 1);
    expect(PlaybackController.playNow).not.toHaveBeenCalled();
  });
});
