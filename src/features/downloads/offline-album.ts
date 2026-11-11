import type { Album, Track } from '@/api/types';
import type { DownloadRecord } from '@/features/downloads/download-rows';

/**
 * Rebuilds an album screen's data from downloaded Tracks, for when the server can't be reached and
 * the query cache has nothing for it. Only what the downloaded Tracks themselves carry is known, so
 * the album is partial: just the tracks that were downloaded, with name/artist/cover taken from
 * them, and no year or starred state. Returns null when no downloaded Track belongs to the album.
 */
export function albumFromDownloads(
  albumId: string,
  records: DownloadRecord[],
): { album: Album; tracks: Track[] } | null {
  const tracks = records
    .filter((r) => r.state === 'complete' && r.track.albumId === albumId)
    .map((r) => r.track);
  if (tracks.length === 0) return null;

  const first = tracks[0];
  const album: Album = {
    id: albumId,
    name: first.album,
    artist: first.artist,
    artistId: first.artistId,
    songCount: tracks.length,
    duration: tracks.reduce((sum, t) => sum + t.duration, 0),
    genre: first.genre,
    coverArtId: first.coverArtId,
    starred: false,
  };
  return { album, tracks };
}
