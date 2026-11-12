import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { Track } from '@/api/types';
import { parseRow } from '@/features/downloads/download-rows';
import type { DownloadRecord, DownloadRow } from '@/features/downloads/download-rows';

/**
 * Durable record of downloaded Tracks (downloads are the one thing that needs real local
 * durability; the query cache is not enough). Separate database from the KV store that backs the
 * query cache. Native only — see downloads-db.web.ts.
 */
let database: SQLiteDatabase | null = null;

/** Opened (and the schema created) on first use rather than at import, so merely importing this
 *  module — e.g. from the auth store or a test — never touches native SQLite. */
function getDb(): SQLiteDatabase {
  if (!database) {
    database = openDatabaseSync('downloads.db');
    database.execSync(`
      CREATE TABLE IF NOT EXISTS downloads (
        server_key TEXT NOT NULL,
        track_id TEXT NOT NULL,
        track_json TEXT NOT NULL,
        file_path TEXT NOT NULL,
        cover_path TEXT,
        size_bytes INTEGER NOT NULL,
        state TEXT NOT NULL,
        PRIMARY KEY (server_key, track_id)
      );
      CREATE TABLE IF NOT EXISTS download_collections (
        server_key TEXT NOT NULL,
        kind TEXT NOT NULL,
        collection_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        PRIMARY KEY (server_key, kind, collection_id, track_id)
      );
    `);
  }
  return database;
}

export type CollectionKind = 'album' | 'playlist' | 'track' | 'favourites';

export function saveDownload(server: string, record: DownloadRecord): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO downloads
       (server_key, track_id, track_json, file_path, cover_path, size_bytes, state)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    server,
    record.track.id,
    JSON.stringify(record.track),
    record.filePath,
    record.coverPath,
    record.sizeBytes,
    record.state,
  );
}

export function getDownload(server: string, trackId: string): DownloadRecord | null {
  const row = getDb().getFirstSync<DownloadRow>(
    'SELECT * FROM downloads WHERE server_key = ? AND track_id = ?',
    server,
    trackId,
  );
  return row ? parseRow(row) : null;
}

export function listDownloads(server: string): DownloadRecord[] {
  return getDb()
    .getAllSync<DownloadRow>('SELECT * FROM downloads WHERE server_key = ?', server)
    .map(parseRow)
    .filter((record): record is DownloadRecord => record !== null);
}

/** Records that `collectionId` (an album, playlist, or the track itself) asked for this track. */
export function addMembership(
  server: string,
  kind: CollectionKind,
  collectionId: string,
  track: Track,
): void {
  getDb().runSync(
    `INSERT OR IGNORE INTO download_collections (server_key, kind, collection_id, track_id)
     VALUES (?, ?, ?, ?)`,
    server,
    kind,
    collectionId,
    track.id,
  );
}

/**
 * Removes a collection's claim on its tracks and returns the downloads no other collection still
 * needs — the caller deletes those files, then calls `deleteDownload`.
 */
export function releaseCollection(
  server: string,
  kind: CollectionKind,
  collectionId: string,
): DownloadRecord[] {
  let orphaned: DownloadRecord[] = [];
  getDb().withTransactionSync(() => {
    getDb().runSync(
      'DELETE FROM download_collections WHERE server_key = ? AND kind = ? AND collection_id = ?',
      server,
      kind,
      collectionId,
    );
    orphaned = orphanedDownloads(server);
  });
  return orphaned;
}

/** Downloads no collection claims any more. */
function orphanedDownloads(server: string): DownloadRecord[] {
  return getDb()
    .getAllSync<DownloadRow>(
      `SELECT d.* FROM downloads d
       WHERE d.server_key = ?
         AND NOT EXISTS (
           SELECT 1 FROM download_collections c
           WHERE c.server_key = d.server_key AND c.track_id = d.track_id)`,
      server,
    )
    .map(parseRow)
    .filter((record): record is DownloadRecord => record !== null);
}

/** Ids of every collection of `kind` that has asked for downloads. */
export function listCollectionIds(server: string, kind: CollectionKind): string[] {
  return getDb()
    .getAllSync<{ collection_id: string }>(
      'SELECT DISTINCT collection_id FROM download_collections WHERE server_key = ? AND kind = ?',
      server,
      kind,
    )
    .map((row) => row.collection_id);
}

/** Ids of the tracks one collection has asked for. */
export function listCollectionTrackIds(
  server: string,
  kind: CollectionKind,
  collectionId: string,
): string[] {
  return getDb()
    .getAllSync<{ track_id: string }>(
      'SELECT track_id FROM download_collections WHERE server_key = ? AND kind = ? AND collection_id = ?',
      server,
      kind,
      collectionId,
    )
    .map((row) => row.track_id);
}

/** Drops one collection's claim on specific tracks and returns the downloads nothing claims now. */
export function releaseTracksFromCollection(
  server: string,
  kind: CollectionKind,
  collectionId: string,
  trackIds: string[],
): DownloadRecord[] {
  let orphaned: DownloadRecord[] = [];
  getDb().withTransactionSync(() => {
    for (const trackId of trackIds) {
      getDb().runSync(
        `DELETE FROM download_collections
         WHERE server_key = ? AND kind = ? AND collection_id = ? AND track_id = ?`,
        server,
        kind,
        collectionId,
        trackId,
      );
    }
    orphaned = orphanedDownloads(server);
  });
  return orphaned;
}

export function listDownloadedIds(server: string): string[] {
  return getDb()
    .getAllSync<{ track_id: string }>(
      "SELECT track_id FROM downloads WHERE server_key = ? AND state = 'complete'",
      server,
    )
    .map((row) => row.track_id);
}

/** Drops every collection's claim on one track — "remove this download" from a track row means
 *  gone, even if an album or playlist had also asked for it. */
export function releaseTrack(server: string, trackId: string): void {
  getDb().runSync('DELETE FROM download_collections WHERE server_key = ? AND track_id = ?', server, trackId);
}

export function deleteDownload(server: string, trackId: string): void {
  getDb().runSync('DELETE FROM downloads WHERE server_key = ? AND track_id = ?', server, trackId);
}

export function clearServer(server: string): void {
  getDb().withTransactionSync(() => {
    getDb().runSync('DELETE FROM downloads WHERE server_key = ?', server);
    getDb().runSync('DELETE FROM download_collections WHERE server_key = ?', server);
  });
}
