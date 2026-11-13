import { Share } from 'react-native';

import { showNotice } from '@/components/use-notice-store';

/** What the Share button sends: the track's name and artist as plain text. No stream link, since
 *  that URL carries the user's credentials. */
export function shareMessage(track: { title: string; artist: string }): string {
  return `${track.title} by ${track.artist}`;
}

/** Opens the platform share sheet (the Web Share API on web); a Notice when sharing isn't available. */
export function shareTrack(track: { title: string; artist: string }): void {
  Share.share({ message: shareMessage(track) }).catch(() => {
    showNotice("Sharing isn't available here.");
  });
}
