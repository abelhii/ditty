import type { StoredCredentialsLike } from '@/features/downloads/download-paths';
import { serverKey } from '@/features/downloads/download-paths';
import { deleteDownload, getDownload } from '@/features/downloads/downloads-db';
import { fileExists } from '@/features/downloads/downloads-files';
import type { TrackSourceDeps } from '@/player/track-source';

/** Binds `resolveTrackSource` to the real downloads DB and filesystem for the signed-in server. */
export function localSourceDeps(credentials: StoredCredentialsLike): TrackSourceDeps {
  const server = serverKey(credentials.serverUrl, credentials.username);
  return {
    lookup: (trackId) => getDownload(server, trackId),
    fileExists,
    onMissingFile: (trackId) => deleteDownload(server, trackId),
  };
}
