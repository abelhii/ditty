import type { Track } from '@/api/types';

export type DownloadState = 'complete' | 'partial';

/** A downloaded Track as persisted: the Track itself (so offline screens don't depend on the
 *  7-day query cache), where its audio lives, and how big it is. */
export type DownloadRecord = {
  track: Track;
  filePath: string;
  coverPath: string | null;
  sizeBytes: number;
  state: DownloadState;
};

/** The raw shape SQLite hands back. */
export type DownloadRow = {
  track_id: string;
  track_json: string;
  file_path: string;
  cover_path: string | null;
  size_bytes: number;
  state: string;
};

function isTrack(value: unknown): value is Track {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return typeof t.id === 'string' && typeof t.title === 'string' && typeof t.duration === 'number';
}

/** Parses a stored row; returns null for a corrupt or unrecognised one instead of throwing, so a
 *  single bad row can't break the whole downloads list. */
export function parseRow(row: DownloadRow): DownloadRecord | null {
  if (row.state !== 'complete' && row.state !== 'partial') return null;
  let track: unknown;
  try {
    track = JSON.parse(row.track_json);
  } catch {
    return null;
  }
  if (!isTrack(track)) return null;
  return {
    track,
    filePath: row.file_path,
    coverPath: row.cover_path,
    sizeBytes: row.size_bytes,
    state: row.state,
  };
}

export type ReconcileResult = {
  /** Rows whose audio file is gone — drop the row. */
  missingFiles: DownloadRecord[];
  /** Files on disk with no row — delete the file. */
  orphanFiles: string[];
};

/**
 * Compares the downloads table against the files actually present. `filesOnDisk` is the set of
 * absolute file paths found under the downloads directory.
 */
export function reconcile(records: DownloadRecord[], filesOnDisk: string[]): ReconcileResult {
  const onDisk = new Set(filesOnDisk);
  const known = new Set<string>();
  for (const record of records) {
    known.add(record.filePath);
    if (record.coverPath) known.add(record.coverPath);
  }
  return {
    missingFiles: records.filter((r) => !onDisk.has(r.filePath)),
    orphanFiles: filesOnDisk.filter((path) => !known.has(path)),
  };
}

/**
 * Cover art files that can be deleted once `removed` downloads are gone: those no remaining download
 * still points at. An album's tracks share one cover file, so removing one track must not delete it.
 */
export function removableCovers(removed: DownloadRecord[], remaining: DownloadRecord[]): string[] {
  const stillUsed = new Set(remaining.map((r) => r.coverPath).filter((c): c is string => c !== null));
  const covers = new Set(removed.map((r) => r.coverPath).filter((c): c is string => c !== null));
  return [...covers].filter((cover) => !stillUsed.has(cover));
}
