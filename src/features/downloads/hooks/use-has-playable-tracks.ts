import type { Track } from '@/api/types';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';
import { useOfflineMode } from '@/features/downloads/use-offline-store';

/** False only in Offline mode when none of `tracks` is downloaded — a collection Play button greys
 *  itself on this. Always true online, and for a not-yet-loaded list. */
export function useHasPlayableTracks(tracks: Track[] | undefined): boolean {
  const offline = useOfflineMode();
  const downloadedIds = useDownloadsStore((state) => state.downloadedIds);
  if (!offline || !tracks || tracks.length === 0) return true;
  return tracks.some((track) => downloadedIds[track.id] === true);
}
