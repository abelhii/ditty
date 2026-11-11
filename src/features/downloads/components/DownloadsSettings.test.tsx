import { fireEvent, render, screen } from '@testing-library/react-native';

import { DownloadsSettings } from '@/features/downloads/components/DownloadsSettings';
import { useDownloadSettingsStore } from '@/features/downloads/use-download-settings-store';

jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@/api/kv-storage', () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }));
jest.mock('@/features/downloads/downloads-files', () => ({ availableBytes: () => 2 * 1024 ** 3 }));

const mockRemoveTracks = jest.fn();
const mockRemoveAll = jest.fn();
const mockSync = jest.fn();
let mockSummary = { groups: [] as unknown[], totalBytes: 0 };
jest.mock('@/features/downloads/downloads-runtime', () => ({
  getDownloadSummary: () => mockSummary,
  removeTrackDownloads: (ids: string[]) => mockRemoveTracks(ids),
  removeAllDownloads: () => mockRemoveAll(),
  syncDownloads: (force: boolean) => mockSync(force),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSummary = { groups: [], totalBytes: 0 };
  useDownloadSettingsStore.setState({ wifiOnly: true, autoDownloadFavourites: false });
});

describe('DownloadsSettings', () => {
  it('shows usage and an empty state', async () => {
    await render(<DownloadsSettings wide={false} />);
    expect(screen.getByText('0 B used · 2.0 GB free')).toBeTruthy();
    expect(screen.getByText('Nothing downloaded yet.')).toBeTruthy();
    expect(screen.queryByText('Remove all downloads')).toBeNull();
  });

  it('lists albums with size and removes one by its track ids', async () => {
    mockSummary = {
      groups: [{ key: 'al1', albumName: 'Record', artist: 'Band', trackIds: ['a', 'b'], sizeBytes: 3 * 1024 ** 2 }],
      totalBytes: 3 * 1024 ** 2,
    };
    await render(<DownloadsSettings wide={false} />);
    expect(screen.getByText('3.0 MB used · 2.0 GB free')).toBeTruthy();
    expect(screen.getByText('Band · 2 tracks · 3.0 MB')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Remove downloads for Record'));
    expect(mockRemoveTracks).toHaveBeenCalledWith(['a', 'b']);
  });

  it('writes the Wi-Fi only switch to the settings store', async () => {
    await render(<DownloadsSettings wide={false} />);
    await fireEvent(screen.getByLabelText('Download on Wi-Fi only'), 'valueChange', false);
    expect(useDownloadSettingsStore.getState().wifiOnly).toBe(false);
  });

  it('turns on Auto-download Favourites and syncs immediately; turning it off does not sync', async () => {
    await render(<DownloadsSettings wide={false} />);
    await fireEvent(screen.getByLabelText('Auto-download Favourites'), 'valueChange', true);
    expect(useDownloadSettingsStore.getState().autoDownloadFavourites).toBe(true);
    expect(mockSync).toHaveBeenCalledWith(true);

    mockSync.mockClear();
    await fireEvent(screen.getByLabelText('Auto-download Favourites'), 'valueChange', false);
    expect(useDownloadSettingsStore.getState().autoDownloadFavourites).toBe(false);
    expect(mockSync).not.toHaveBeenCalled();
  });
});
