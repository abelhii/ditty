/** Web has no file download (see downloads-files.ts) — every operation is a no-op. */
export function ensureServerDirectory(_server: string): void {}
export function listFileUris(_server: string): string[] {
  return [];
}
export function fileSize(_uri: string): number {
  return 0;
}
export function deleteFile(_uri: string): void {}
export function deleteServerDirectory(_server: string): void {}
export function availableBytes(): number {
  return 0;
}
