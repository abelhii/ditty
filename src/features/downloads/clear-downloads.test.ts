import { clearServerDownloads } from '@/features/downloads/clear-downloads';
import { serverKey } from '@/features/downloads/download-paths';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

const mockClearServer = jest.fn();
const mockDeleteDir = jest.fn();
jest.mock('@/features/downloads/downloads-db', () => ({ clearServer: (s: string) => mockClearServer(s) }));
jest.mock('@/features/downloads/downloads-files', () => ({ deleteServerDirectory: (s: string) => mockDeleteDir(s) }));

it('deletes files and rows for the server+user and resets the UI state', () => {
  useDownloadsStore.setState({
    items: { a: { status: 'queued', progress: 0 } },
    downloadedIds: { b: true },
  });
  clearServerDownloads('https://x', 'u');
  const key = serverKey('https://x', 'u');
  expect(mockDeleteDir).toHaveBeenCalledWith(key);
  expect(mockClearServer).toHaveBeenCalledWith(key);
  expect(useDownloadsStore.getState().items).toEqual({});
  expect(useDownloadsStore.getState().downloadedIds).toEqual({});
});
