import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Track } from '@/api/types';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { showConfirmation } from '@/components/use-notice-store';
import * as PlaybackController from '@/player/PlaybackController';

jest.mock('@/global.css', () => ({}));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));
jest.mock('@/components/use-notice-store', () => ({ showConfirmation: jest.fn() }));
jest.mock('@/player/PlaybackController', () => ({ playNext: jest.fn(), addToQueue: jest.fn() }));
jest.mock('@/features/downloads/hooks/use-download-state', () => ({
  useTrackDownloadState: () => ({ kind: 'unavailable' }),
}));
jest.mock('@/features/playlists/components/AddToPlaylistSheet', () => ({ AddToPlaylistSheet: () => null }));

const mockMutate = jest.fn();
jest.mock('@/features/favourites/hooks/use-star', () => ({
  useStar: () => ({ mutate: mockMutate }),
  useUnstar: () => ({ mutate: mockMutate }),
}));

const track: Track = { id: 't1', title: 'Song', artist: 'Artist', album: 'Album', duration: 125, starred: false };

beforeEach(() => jest.clearAllMocks());

describe('TrackActionsMenu feedback', () => {
  it('confirms Add to queue', async () => {
    await render(<TrackActionsMenu track={track} onClose={() => {}} />);
    await fireEvent.press(screen.getByText('Add to queue'));

    expect(PlaybackController.addToQueue).toHaveBeenCalledWith(track);
    expect(showConfirmation).toHaveBeenCalledWith('Added to Queue');
  });

  it('confirms Play next', async () => {
    await render(<TrackActionsMenu track={track} onClose={() => {}} />);
    await fireEvent.press(screen.getByText('Play next'));

    expect(PlaybackController.playNext).toHaveBeenCalledWith(track);
    expect(showConfirmation).toHaveBeenCalledWith('Playing next');
  });

  it('confirms a Favourite only once the star succeeds', async () => {
    await render(<TrackActionsMenu track={track} onClose={() => {}} />);
    await fireEvent.press(screen.getByText('Add to Favourites'));

    expect(showConfirmation).not.toHaveBeenCalled();
    mockMutate.mock.calls[0][1].onSuccess();
    expect(showConfirmation).toHaveBeenCalledWith('Added to Favourites');
  });

  it('confirms removing a Favourite once the unstar succeeds', async () => {
    await render(<TrackActionsMenu track={{ ...track, starred: true }} onClose={() => {}} />);
    await fireEvent.press(screen.getByText('Remove from Favourites'));

    mockMutate.mock.calls[0][1].onSuccess();
    expect(showConfirmation).toHaveBeenCalledWith('Removed from Favourites');
  });
});
