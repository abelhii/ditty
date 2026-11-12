import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Track } from '@/api/types';
import { DownloadCollectionButton } from '@/features/downloads/components/DownloadCollectionButton';

jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

const mockRemoveCollection = jest.fn();
jest.mock('@/features/downloads/downloads-runtime', () => ({
  removeCollectionDownload: (...args: unknown[]) => mockRemoveCollection(...args),
  cancelDownloads: () => {},
  downloadTracks: () => {},
}));

jest.mock('@/features/downloads/hooks/use-download-state', () => ({
  useCollectionDownloadState: () => ({ kind: 'downloaded', progress: 1 }),
}));

const tracks = [{ id: 'a' }, { id: 'b' }] as Track[];

beforeEach(() => jest.clearAllMocks());

describe('DownloadCollectionButton remove', () => {
  it('asks before removing a downloaded album and does nothing yet', async () => {
    await render(<DownloadCollectionButton kind="album" collectionId="al1" tracks={tracks} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove album download' }));

    expect(screen.getByText('Remove downloaded album?')).toBeTruthy();
    expect(mockRemoveCollection).not.toHaveBeenCalled();
  });

  it('confirming removes the collection by its track ids', async () => {
    await render(<DownloadCollectionButton kind="album" collectionId="al1" tracks={tracks} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove album download' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));

    expect(mockRemoveCollection).toHaveBeenCalledWith('album', 'al1', ['a', 'b']);
  });

  it('cancelling leaves the downloads in place', async () => {
    await render(<DownloadCollectionButton kind="playlist" collectionId="p1" tracks={tracks} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove playlist download' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockRemoveCollection).not.toHaveBeenCalled();
  });
});
