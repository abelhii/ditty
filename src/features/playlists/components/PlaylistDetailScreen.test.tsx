import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { PlaylistDetailScreen } from '@/features/playlists/components/PlaylistDetailScreen';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const mockDelete = jest.fn();
const mockRemove = jest.fn();
jest.mock('@/features/playlists/hooks/use-delete-playlist', () => ({
  useDeletePlaylist: () => ({ mutate: mockDelete }),
}));
jest.mock('@/features/playlists/hooks/use-remove-from-playlist', () => ({
  useRemoveFromPlaylist: () => ({ mutate: mockRemove }),
}));
jest.mock('@/features/playlists/hooks/use-update-playlist', () => ({
  useUpdatePlaylist: () => ({ mutate: () => {} }),
}));
jest.mock('@/features/playlists/hooks/use-playlist', () => ({
  usePlaylist: () => ({
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
    data: {
      playlist: { id: 'p1', name: 'Road trip', songCount: 2, duration: 600, isPublic: false, coverArtId: undefined },
      tracks: [
        { id: 't1', title: 'First' },
        { id: 't2', title: 'Second' },
      ],
    },
  }),
}));

// Heavy children, stubbed down to the one hook each needs for these tests.
jest.mock('@/components/CoverArtImage', () => ({ CoverArtImage: () => null }));
jest.mock('@/features/downloads/components/DownloadCollectionButton', () => ({
  DownloadCollectionButton: () => null,
}));
jest.mock('@/components/TrackRow', () => ({
  TrackRow: ({ track, onOverflowPress }: { track: { id: string; title: string }; onOverflowPress: () => void }) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${track.title}`} onPress={onOverflowPress}>
        <Text>{track.title}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/TrackActionsMenu', () => ({
  TrackActionsMenu: ({
    track,
    onClose,
    onRemoveFromPlaylist,
  }: {
    track: unknown;
    onClose: () => void;
    onRemoveFromPlaylist?: () => void;
  }) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
    return track ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove from this playlist"
        onPress={() => {
          // Same order as the real menu: act, then close.
          onRemoveFromPlaylist?.();
          onClose();
        }}>
        <Text>Remove from this playlist</Text>
      </Pressable>
    ) : null;
  },
}));

beforeEach(() => jest.clearAllMocks());

async function openDeleteConfirm() {
  await render(<PlaylistDetailScreen playlistId="p1" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Playlist options' }));
  await fireEvent.press(screen.getByText('Delete playlist'));
}

async function openRemoveConfirm() {
  await render(<PlaylistDetailScreen playlistId="p1" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Options for Second' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Remove from this playlist' }));
}

describe('PlaylistDetailScreen destructive actions', () => {
  it('asks before deleting the playlist and does nothing yet', async () => {
    await openDeleteConfirm();

    expect(screen.getByText('Delete playlist?')).toBeTruthy();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('cancelling the delete leaves the playlist and the screen alone', async () => {
    await openDeleteConfirm();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('confirming the delete deletes the playlist and navigates back', async () => {
    await openDeleteConfirm();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    expect(mockDelete).toHaveBeenCalledWith('p1');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('asks before removing a track and does nothing yet', async () => {
    await openRemoveConfirm();

    expect(screen.getByText('Remove from playlist?')).toBeTruthy();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('cancelling the removal keeps the track', async () => {
    await openRemoveConfirm();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('confirming the removal removes that track by its position', async () => {
    await openRemoveConfirm();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));

    expect(mockRemove).toHaveBeenCalledWith({ playlistId: 'p1', index: 1 });
  });
});
