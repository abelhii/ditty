import { formatBytes, totalBytes } from '@/features/downloads/storage-usage';
import type { DownloadRecord } from '@/features/downloads/download-rows';

const track = { id: 't', title: 'S', artist: 'A', album: 'B', duration: 1, starred: false };
const rec = (sizeBytes: number): DownloadRecord => ({
  track,
  filePath: 'f',
  coverPath: null,
  sizeBytes,
  state: 'complete',
});

describe('totalBytes', () => {
  it('sums sizes and is 0 for none', () => {
    expect(totalBytes([])).toBe(0);
    expect(totalBytes([rec(10), rec(32)])).toBe(42);
  });
});

describe('formatBytes', () => {
  it('formats across units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 ** 2)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0 GB');
  });

  it('treats zero, negative and non-finite as 0 B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });
});
