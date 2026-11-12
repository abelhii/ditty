import { getDownloadSummary } from '@/features/downloads/downloads-runtime';
import { usePlayerStore } from '@/player/use-player-store';

/** What logging out would destroy, as a sentence for the confirmation — or null when there is
 *  nothing to lose and logout can go ahead unasked. Shared by Settings and the Re-authentication
 *  prompt so both paths guard the same way. */
export function logoutLossWarning(): string | null {
  const hasDownloads = getDownloadSummary().groups.length > 0;
  const hasQueue = usePlayerStore.getState().queue.tracks.length > 0;
  if (hasDownloads && hasQueue) return 'Your queue and downloaded music will be deleted from this device.';
  if (hasDownloads) return 'Downloaded music will be deleted from this device.';
  if (hasQueue) return 'Your queue will be cleared.';
  return null;
}
