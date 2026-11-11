import type { DownloadRecord } from '@/features/downloads/download-rows';

export type DownloadGroup = {
  /** Album id, or the album name when the track carries no album id. */
  key: string;
  albumName: string;
  artist: string;
  trackIds: string[];
  sizeBytes: number;
};

/** Groups completed downloads by album for the storage list, sorted by album name. Tracks of
 *  playlist-only downloads still land under their own album. */
export function groupByAlbum(records: DownloadRecord[]): DownloadGroup[] {
  const groups = new Map<string, DownloadGroup>();
  for (const { track, sizeBytes, state } of records) {
    if (state !== 'complete') continue;
    const key = track.albumId ?? track.album;
    const group = groups.get(key) ?? {
      key,
      albumName: track.album,
      artist: track.artist,
      trackIds: [],
      sizeBytes: 0,
    };
    group.trackIds.push(track.id);
    group.sizeBytes += sizeBytes;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.albumName.localeCompare(b.albumName));
}
