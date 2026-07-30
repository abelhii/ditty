import { useEffect, useRef } from 'react';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/useAuthStore';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';

/**
 * The web counterpart of {@link NotificationBridge} — Metro resolves this `.web.tsx` over the
 * native file, so the native `PlaybackNotificationManager` module never loads in a browser.
 *
 * The OS gives play/pause for free (it infers those from the underlying `<audio>` element), but the
 * next/previous/seek buttons in macOS Control Center / the media keys only appear once we register
 * handlers on the **Media Session API** (`navigator.mediaSession`). This mirrors the native bridge's
 * reactive pattern: subscribe to the stores, forward each OS button into the same
 * `PlaybackController` entry points the UI uses (docs/adr/0001-player-state-flows-through-store.md).
 */
export function NotificationBridge() {
  const credentials = useAuthStore((state) => state.credentials);
  const queue = usePlayerStore((state) => state.queue);
  const status = usePlaybackStatusStore((state) => state.status);
  const position = usePlaybackStatusStore((state) => state.position);

  const currentTrack = getCurrentTrack(queue);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Register the action handlers once. They live globally on navigator.mediaSession, so they're
  // torn down (set to null) on unmount. Matching the native ENABLED_CONTROLS set: play / pause /
  // nexttrack / previoustrack / seekto — see the step 3 grilling session (PLAN.md Build Order).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => PlaybackController.resume()],
      ['pause', () => PlaybackController.pause()],
      ['nexttrack', () => PlaybackController.skipNext()],
      ['previoustrack', () => PlaybackController.skipPrevious()],
      ['seekto', (details) => {
        if (details.seekTime != null) PlaybackController.seekTo(details.seekTime);
      }],
    ];

    for (const [action, handler] of handlers) {
      // Unsupported actions throw in some browsers — ignore those rather than failing the rest.
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* action not supported in this browser */
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  // Reflect the current track + playback state into the OS Now Playing surface.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;

    if (!currentTrack) {
      session.metadata = null;
      session.playbackState = 'none';
      return;
    }

    const artworkUri =
      credentials &&
      getCoverArtUrl(credentials.serverUrl, currentTrack.coverArtId, credentials, CoverArtSize.detail);

    session.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: artworkUri
        ? [{ src: artworkUri, sizes: `${CoverArtSize.detail}x${CoverArtSize.detail}` }]
        : [],
    });
    session.playbackState = status === 'playing' ? 'playing' : 'paused';

    // The OS interpolates the scrubber locally from playbackRate, so — like the native bridge —
    // we seed it from positionRef on track/status changes rather than on every position tick.
    // setPositionState throws unless 0 <= position <= duration and duration > 0, so guard it.
    if (typeof session.setPositionState === 'function' && currentTrack.duration > 0) {
      const clamped = Math.min(Math.max(0, positionRef.current), currentTrack.duration);
      session.setPositionState({ duration: currentTrack.duration, position: clamped, playbackRate: 1 });
    }
  }, [credentials, currentTrack, status]);

  return null;
}
