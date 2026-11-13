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
jest.mock('@/player/PlaybackController', () => ({
  play: jest.fn(),
  playNow: jest.fn(),
  playShuffled: jest.fn(),
}));
jest.mock('@/features/downloads/components/DownloadCollectionButton', () => ({
  DownloadCollectionButton: () => null,
}));
jest.mock('@/features/downloads/downloads-runtime', () => ({ FAVOURITES_ID: 'starred' }));
const mockHasPlayable = jest.fn(() => true);
jest.mock('@/features/downloads/hooks/use-has-playable-tracks', () => ({
  useHasPlayableTracks: () => mockHasPlayable(),
}));

const makeTrack = (id: string, title: string, starredAt: string): Track => ({
  id,
  title,
  artist: 'Artist',
  album: 'Album',
  duration: 1800,
  starred: true,
  starredAt,
});
// Server order is arbitrary; the default sort is newest-liked first: Third, First, Second.
const mockTracks = [
  makeTrack('1', 'First', '2026-02-01T00:00:00Z'),
  makeTrack('2', 'Second', '2026-01-01T00:00:00Z'),
  makeTrack('3', 'Third', '2026-03-01T00:00:00Z'),
];
const [first, second, third] = mockTracks;

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPlayable.mockReturnValue(true);
  });

  it('shows the count and total duration in the header', async () => {
    await render(<LikedSongsScreen />);

    expect(screen.getByText('3 songs · 1 hr 30 min')).toBeTruthy();
  });

  it('replaces the Queue with the sorted list, starting at the tapped track', async () => {
    await render(<LikedSongsScreen />);

    await fireEvent.press(screen.getByText('Second'));

    expect(PlaybackController.play).toHaveBeenCalledWith([third, first, second], 2);
    expect(PlaybackController.playNow).not.toHaveBeenCalled();
  });

  it('Play starts at the first row of the default (recently liked) order', async () => {
    await render(<LikedSongsScreen />);

    await fireEvent.press(screen.getByLabelText('Play Liked Songs'));

    expect(PlaybackController.play).toHaveBeenCalledWith([third, first, second], 0);
  });

  it('Play follows the chosen sort', async () => {
    await render(<LikedSongsScreen />);

    await fireEvent.press(screen.getByLabelText('Sort by Title A-Z'));
    await fireEvent.press(screen.getByLabelText('Play Liked Songs'));

    expect(PlaybackController.play).toHaveBeenCalledWith([first, second, third], 0);
  });

  it('Shuffle plays the whole list shuffled', async () => {
    await render(<LikedSongsScreen />);

    await fireEvent.press(screen.getByLabelText('Shuffle Liked Songs'));

    expect(PlaybackController.playShuffled).toHaveBeenCalledWith([third, first, second]);
  });

  it('hints that nothing is downloaded when offline with no playable tracks, but stays tappable', async () => {
    mockHasPlayable.mockReturnValue(false);
    await render(<LikedSongsScreen />);

    expect(screen.getByLabelText('Play Liked Songs').props.accessibilityHint).toBe(
      'Nothing in Liked Songs is downloaded',
    );
    await fireEvent.press(screen.getByLabelText('Play Liked Songs'));
    expect(PlaybackController.play).toHaveBeenCalled();
  });
});
