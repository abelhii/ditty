import { parseRow, reconcile } from '@/features/downloads/download-rows';
import type { DownloadRecord, DownloadRow } from '@/features/downloads/download-rows';

const track = { id: 't1', title: 'Song', artist: 'A', album: 'B', duration: 200, starred: false };

function row(overrides: Partial<DownloadRow> = {}): DownloadRow {
  return {
    track_id: 't1',
    track_json: JSON.stringify(track),
    file_path: 'file:///d/t1.flac',
    cover_path: 'file:///d/cover-x.jpg',
    size_bytes: 1000,
    state: 'complete',
    ...overrides,
  };
}

function record(filePath: string, coverPath: string | null = null): DownloadRecord {
  return { track, filePath, coverPath, sizeBytes: 1, state: 'complete' };
}

describe('parseRow', () => {
  it('parses a valid row', () => {
    expect(parseRow(row())).toEqual({
      track,
      filePath: 'file:///d/t1.flac',
      coverPath: 'file:///d/cover-x.jpg',
      sizeBytes: 1000,
      state: 'complete',
    });
  });

  it('keeps a null cover path', () => {
    expect(parseRow(row({ cover_path: null }))?.coverPath).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    expect(parseRow(row({ track_json: '{nope' }))).toBeNull();
  });

  it('returns null for JSON that is not a Track', () => {
    expect(parseRow(row({ track_json: 'null' }))).toBeNull();
    expect(parseRow(row({ track_json: '{"id":"t1"}' }))).toBeNull();
  });

  it('returns null for an unknown state', () => {
    expect(parseRow(row({ state: 'weird' }))).toBeNull();
  });
});

describe('reconcile', () => {
  it('reports nothing for an empty library and empty disk', () => {
    expect(reconcile([], [])).toEqual({ missingFiles: [], orphanFiles: [] });
  });

  it('finds a row whose audio file is gone', () => {
    const r = record('file:///d/t1.flac');
    expect(reconcile([r], []).missingFiles).toEqual([r]);
  });

  it('finds a file with no row', () => {
    expect(reconcile([], ['file:///d/stray.flac']).orphanFiles).toEqual(['file:///d/stray.flac']);
  });

  it('does not treat a known cover file as an orphan', () => {
    const r = record('file:///d/t1.flac', 'file:///d/cover-x.jpg');
    const result = reconcile([r], ['file:///d/t1.flac', 'file:///d/cover-x.jpg']);
    expect(result).toEqual({ missingFiles: [], orphanFiles: [] });
  });
});
