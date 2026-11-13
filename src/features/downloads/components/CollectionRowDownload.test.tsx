import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { CollectionRowDownload } from '@/features/downloads/components/CollectionRowDownload';

jest.mock('@/global.css', () => ({}));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));

const mockDownloadTracks = jest.fn();
const mockCancel = jest.fn();
const mockRemove = jest.fn();
jest.mock('@/features/downloads/downloads-runtime', () => ({
  downloadTracks: (...args: unknown[]) => mockDownloadTracks(...args),
  cancelDownloads: (...args: unknown[]) => mockCancel(...args),
  removeCollectionDownload: (...args: unknown[]) => mockRemove(...args),
}));

let mockRowState: { kind: string; progress: number } = { kind: 'idle', progress: 0 };
jest.mock('@/features/downloads/hooks/use-collection-row-download-state', () => ({
  useCollectionRowDownloadState: () => ({ state: mockRowState, memberIds: ['a', 'b'] }),
}));

const mockFetchQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ fetchQuery: (...args: unknown[]) => mockFetchQuery(...args) }),
}));

jest.mock('@/auth/use-auth-store', () => ({
  useAuthStore: { getState: () => ({ credentials: { serverUrl: 'https://s', username: 'u' } }) },
}));

const mockShowNotice = jest.fn();
jest.mock('@/components/use-notice-store', () => ({
  showNotice: (...args: unknown[]) => mockShowNotice(...args),
}));

const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  mockRowState = { kind: 'idle', progress: 0 };
  Platform.OS = 'ios';
});
afterAll(() => {
  Platform.OS = originalOS;
});

function renderRow(kind: 'album' | 'playlist' = 'playlist', songCount = 2) {
  return render(<CollectionRowDownload kind={kind} collectionId="c1" name="Mix" songCount={songCount} />);
}

describe('CollectionRowDownload', () => {
  it('offers Download when nothing is downloaded and fetches the Tracks on demand', async () => {
    mockFetchQuery.mockResolvedValue({ playlist: {}, tracks: [{ id: 'a' }, { id: 'b' }] });
    await renderRow();
    await fireEvent.press(screen.getByRole('button', { name: 'Download Mix' }));

    expect(mockFetchQuery).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['playlist', 'c1'] }));
    expect(mockDownloadTracks).toHaveBeenCalledWith('playlist', 'c1', [{ id: 'a' }, { id: 'b' }]);
  });

  it('fetches an album through its own query key', async () => {
    mockFetchQuery.mockResolvedValue({ album: {}, tracks: [{ id: 'a' }] });
    await renderRow('album');
    await fireEvent.press(screen.getByRole('button', { name: 'Download Mix' }));

    expect(mockFetchQuery).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['album', 'c1'] }));
    expect(mockDownloadTracks).toHaveBeenCalledWith('album', 'c1', [{ id: 'a' }]);
  });

  it('shows a Notice and downloads nothing when fetching the Tracks fails', async () => {
    mockFetchQuery.mockRejectedValue(new Error('offline'));
    await renderRow();
    await fireEvent.press(screen.getByRole('button', { name: 'Download Mix' }));

    expect(mockShowNotice).toHaveBeenCalledWith("Couldn't download Mix.");
    expect(mockDownloadTracks).not.toHaveBeenCalled();
  });

  it('offers to finish a partly downloaded collection', async () => {
    mockRowState = { kind: 'partial', progress: 0 };
    mockFetchQuery.mockResolvedValue({ tracks: [{ id: 'a' }] });
    await renderRow();
    await fireEvent.press(screen.getByRole('button', { name: 'Finish downloading Mix' }));

    expect(mockDownloadTracks).toHaveBeenCalled();
  });

  it('cancels the requested Tracks while downloading', async () => {
    mockRowState = { kind: 'downloading', progress: 0.5 };
    await renderRow();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel Mix download, 50%' }));

    expect(mockCancel).toHaveBeenCalledWith(['a', 'b']);
  });

  it('asks before removing a downloaded collection, then removes it', async () => {
    mockRowState = { kind: 'downloaded', progress: 1 };
    await renderRow();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Mix download' }));

    expect(screen.getByText('Remove downloaded playlist?')).toBeTruthy();
    expect(mockRemove).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    expect(mockRemove).toHaveBeenCalledWith('playlist', 'c1', ['a', 'b']);
  });

  it('offers Retry after a failure', async () => {
    mockRowState = { kind: 'failed', progress: 0 };
    mockFetchQuery.mockResolvedValue({ tracks: [{ id: 'a' }] });
    await renderRow();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry Mix download' }));

    expect(mockDownloadTracks).toHaveBeenCalled();
  });

  it('gives the control a 44pt touch target', async () => {
    await renderRow();
    const style = screen.getByRole('button', { name: 'Download Mix' }).props.style;
    const flat = Object.assign({}, ...[style].flat(3).filter(Boolean));
    expect(flat.width).toBeGreaterThanOrEqual(44);
    expect(flat.height).toBeGreaterThanOrEqual(44);
  });

  it('renders nothing for an empty collection', async () => {
    await renderRow('playlist', 0);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing on web', async () => {
    Platform.OS = 'web';
    await renderRow();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
