import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { Track } from '@/api/types';
import { AddToPlaylistSheet } from '@/features/playlists/components/AddToPlaylistSheet';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

const mockAdd = jest.fn();
jest.mock('@/features/playlists/hooks/use-add-to-playlist', () => ({
  useAddToPlaylist: () => ({ mutate: mockAdd }),
}));
jest.mock('@/features/playlists/hooks/use-create-playlist', () => ({
  useCreatePlaylist: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/features/playlists/hooks/use-playlists', () => ({
  usePlaylists: () => ({ isLoading: false, data: [{ id: 'p1', name: 'Road trip' }] }),
}));

const track: Track = { id: 't1', title: 'Song', artist: 'Artist', album: 'Album', duration: 125, starred: false };

describe('AddToPlaylistSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAdd.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('adds the track right away but closes only after the confirmation has shown', async () => {
    const onClose = jest.fn();
    await render(<AddToPlaylistSheet track={track} onClose={onClose} />);

    await fireEvent.press(screen.getByText('Road trip'));

    expect(mockAdd).toHaveBeenCalledWith({ playlistId: 'p1', track });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores a second tap while the confirmation is showing', async () => {
    await render(<AddToPlaylistSheet track={track} onClose={() => {}} />);

    await fireEvent.press(screen.getByText('Road trip'));
    await fireEvent.press(screen.getByText('Road trip'));

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });
});
