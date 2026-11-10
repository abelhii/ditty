import { Directory, File, Paths } from 'expo-file-system';

/**
 * Audio and cover art live under the document directory, not the cache directory — the OS may
 * evict the cache, which would silently drop downloads. Native only; web has no file download.
 */
function serverDirectory(server: string): Directory {
  return new Directory(Paths.document, 'downloads', server);
}

export function ensureServerDirectory(server: string): Directory {
  const dir = serverDirectory(server);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Absolute URIs of every file under this server's downloads directory. */
export function listFileUris(server: string): string[] {
  const dir = serverDirectory(server);
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => file.uri);
}

export function fileSize(uri: string): number {
  return new File(uri).size ?? 0;
}

export function deleteFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function deleteServerDirectory(server: string): void {
  const dir = serverDirectory(server);
  if (dir.exists) dir.delete();
}

/** Free space on the device, in bytes — for the storage UI. */
export function availableBytes(): number {
  return Paths.availableDiskSpace;
}

export function fileExists(uri: string): boolean {
  return new File(uri).exists;
}
