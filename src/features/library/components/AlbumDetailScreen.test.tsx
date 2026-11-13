import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AlbumDetailScreen } from '@/features/library/components/AlbumDetailScreen';

// theme.ts imports a stylesheet that jest cannot parse.
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: () => {} }) }));

const mockPlay = jest.fn();
const mockPlayShuffled = jest.fn();
jest.mock('@/player/PlaybackController', () => ({
  play: (...args: unknown[]) => mockPlay(...args),
  playShuffled: (...args: unknown[]) => mockPlayShuffled(...args),
}));

jest.mock('@/features/library/hooks/use-album', () => ({
  useAlbum: () => ({
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
    data: {
      album: { id: 'a1', name: 'Night Drive', artist: 'Someone', coverArtId: undefined },
      tracks: [
        { id: 't1', title: 'First' },
        { id: 't2', title: 'Second' },
      ],
    },
  }),
}));

let mockCanPlay = true;
jest.mock('@/features/downloads/hooks/use-has-playable-tracks', () => ({
  useHasPlayableTracks: () => mockCanPlay,
}));

// Heavy children, stubbed out; they are not what these tests cover.
jest.mock('@/components/CoverArtImage', () => ({ CoverArtImage: () => null }));
jest.mock('@/components/FavouriteButton', () => ({ FavouriteButton: () => null }));
jest.mock('@/features/downloads/components/DownloadCollectionButton', () => ({
  DownloadCollectionButton: () => null,
}));
jest.mock('@/components/TrackRow', () => ({ TrackRow: () => null }));
jest.mock('@/components/TrackActionsMenu', () => ({ TrackActionsMenu: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanPlay = true;
});

const tracks = [
  { id: 't1', title: 'First' },
  { id: 't2', title: 'Second' },
];

describe('AlbumDetailScreen header', () => {
  it('Shuffle plays the whole album shuffled; Play starts it in order', async () => {
    await render(<AlbumDetailScreen albumId="a1" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Shuffle album' }));
    expect(mockPlayShuffled).toHaveBeenCalledWith(tracks, 'Night Drive');

    await fireEvent.press(screen.getByRole('button', { name: 'Play album' }));
    expect(mockPlay).toHaveBeenCalledWith(tracks, 0, 'Night Drive');
  });

  it('gives Shuffle the same unavailable hint as Play when nothing is playable', async () => {
    mockCanPlay = false;
    await render(<AlbumDetailScreen albumId="a1" />);

    const hint = 'Nothing in this album is downloaded';
    expect(screen.getByRole('button', { name: 'Shuffle album' }).props.accessibilityHint).toBe(hint);
    expect(screen.getByRole('button', { name: 'Play album' }).props.accessibilityHint).toBe(hint);
  });
});
