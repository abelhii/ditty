import { useEffect, useRef } from 'react';

import { PlaybackNotificationManager, type PlaybackControlName } from 'react-native-audio-api';

import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';

const ENABLED_CONTROLS: PlaybackControlName[] = ['play', 'pause', 'nextTrack', 'previousTrack', 'seekTo'];
const DISABLED_CONTROLS: PlaybackControlName[] = ['stop', 'skipForward', 'skipBackward'];

/**
 * Mirrors AudioEngine's reactive pattern: subscribes to `usePlayerStore` to render the OS
 * lock-screen/notification controls, and forwards button presses back into
 * PlaybackController — the same entry point the UI itself uses. Control set decided in the
 * step 3 grilling session (2026-07-26): play/pause/nextTrack/previousTrack/seekTo only. See
 * docs/adr/0001-player-state-flows-through-store.md.
 */
export function NotificationBridge() {
  const queue = usePlayerStore((state) => state.queue);
  const status = usePlaybackStatusStore((state) => state.status);
  const position = usePlaybackStatusStore((state) => state.position);

  const currentTrack = getCurrentTrack(queue);
  const hasEnabledControls = useRef(false);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const subscriptions = [
      PlaybackNotificationManager.addEventListener('playbackNotificationPlay', () => {
        PlaybackController.resume();
      }),
      PlaybackNotificationManager.addEventListener('playbackNotificationPause', () => {
        PlaybackController.pause();
      }),
      PlaybackNotificationManager.addEventListener('playbackNotificationNextTrack', () => {
        PlaybackController.skipNext();
      }),
      PlaybackNotificationManager.addEventListener('playbackNotificationPreviousTrack', () => {
        PlaybackController.skipPrevious();
      }),
      PlaybackNotificationManager.addEventListener('playbackNotificationSeekTo', (event) => {
        PlaybackController.seekTo(event.value);
      }),
    ];

    return () => subscriptions.forEach((subscription) => subscription?.remove());
  }, []);

  useEffect(() => {
    if (!currentTrack) {
      hasEnabledControls.current = false;
      PlaybackNotificationManager.hide();
      return;
    }

    if (!hasEnabledControls.current) {
      ENABLED_CONTROLS.forEach((control) => PlaybackNotificationManager.enableControl(control, true));
      DISABLED_CONTROLS.forEach((control) => PlaybackNotificationManager.enableControl(control, false));
      hasEnabledControls.current = true;
    }

    PlaybackNotificationManager.show({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      duration: currentTrack.duration,
      elapsedTime: positionRef.current,
      state: status === 'playing' ? 'playing' : 'paused',
    });
    // Reads positionRef rather than depending on `position` directly: the OS interpolates the
    // scrubber from elapsedTime locally, so re-showing on every position tick would be a lot
    // of native calls for no visible benefit.
  }, [currentTrack, status]);

  return null;
}
