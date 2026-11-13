import { CoverArtSize, getCoverArtUrl, getStreamUrl } from '@/api/subsonic/endpoints/media';
import type { SubsonicAuth } from '@/api/subsonic/types';
import type { Track } from '@/api/types';
import type { DownloadRecord } from '@/features/downloads/download-rows';
import { useStreamQualityStore } from '@/player/use-stream-quality-store';

export type TrackSource = {
  /** What to hand `player.replace` — a `file://` URI for a downloaded track, else the stream URL. */
  uri: string;
  /** Lock-screen artwork — the downloaded cover file when there is one, so it works offline. */
  artworkUrl: string | undefined;
  isLocal: boolean;
};

export type TrackSourceDeps = {
  lookup: (trackId: string) => DownloadRecord | null;
  fileExists: (uri: string) => boolean;
  /** A download row whose audio file has vanished (cleared by the OS, removed externally). The row
   *  is stale — the caller drops it so the UI stops showing the track as downloaded. */
  onMissingFile: (trackId: string) => void;
};

/**
 * Picks where a Track plays from: its downloaded file if a complete download exists and the file is
 * really there, otherwise the server stream. Pure — `AudioEngine` stays the only module that touches
 * the player; it just asks this where to point it.
 */
export function resolveTrackSource(
  track: Track,
  serverUrl: string,
  auth: SubsonicAuth,
  deps: TrackSourceDeps,
): TrackSource {
  const remoteArtwork = getCoverArtUrl(serverUrl, track.coverArtId, auth, CoverArtSize.detail);
  const record = deps.lookup(track.id);

  if (record && record.state === 'complete') {
    if (deps.fileExists(record.filePath)) {
      const cover =
        record.coverPath && deps.fileExists(record.coverPath) ? record.coverPath : remoteArtwork;
      return { uri: record.filePath, artworkUrl: cover, isLocal: true };
    }
    deps.onMissingFile(track.id);
  }

  const quality = useStreamQualityStore.getState().quality;
  return {
    uri: getStreamUrl(serverUrl, track.id, auth, quality),
    artworkUrl: remoteArtwork,
    isLocal: false,
  };
}
