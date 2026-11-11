import { serverKey } from '@/features/downloads/download-paths';
import { clearServer } from '@/features/downloads/downloads-db';
import { deleteServerDirectory } from '@/features/downloads/downloads-files';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';

/**
 * Deletes every downloaded file and row for one server+user. Kept free of the auth store and the
 * download manager so `logout()` can call it without an import cycle; in-flight downloads are
 * cancelled separately by the runtime when the session ends.
 */
export function clearServerDownloads(serverUrl: string, username: string): void {
  const server = serverKey(serverUrl, username);
  deleteServerDirectory(server);
  clearServer(server);
  useDownloadsStore.setState({ items: {}, downloadedIds: {} });
}
