import type { DownloadRecord } from '@/features/downloads/download-rows';

export function totalBytes(records: DownloadRecord[]): number {
  return records.reduce((sum, r) => sum + r.sizeBytes, 0);
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** "1.5 GB" style size; negative or non-finite input reads as "0 B". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${UNITS[exponent]}`;
}
