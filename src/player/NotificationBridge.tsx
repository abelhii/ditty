import { Command, MediaControl, PlaybackState } from 'expo-media-control';
import { useEffect, useRef } from 'react';

import { useAuthStore } from '@/auth/use-auth-store';
import { localSourceDeps } from '@/features/downloads/local-source-deps';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore, type PlaybackStatus } from '@/player/use-playback-status-store';
import { resolveTrackSource } from '@/player/track-source';
import { usePlayerStore } from '@/player/use-player-store';

const STATE_FOR_STATUS: Record<PlaybackStatus, PlaybackState> = {
  idle: PlaybackState.NONE,
  stopped: PlaybackState.STOPPED,
  loading: PlaybackState.BUFFERING,
  playing: PlaybackState.PLAYING,
  paused: PlaybackState.PAUSED,
  error: PlaybackState.ERROR,
};

/**
 * The native OS media controls (Android media notification, iOS lock screen / Control Center),
 * driven by expo-media-control. expo-audio's own `setActiveForLockScreen` can't show
 * next/previous (stock 57.x strips them), so the controls live here instead and AudioEngine no
 * longer registers the player with the lock screen — the two must not both own the session.
 *
 * Same reactive pattern as the web counterpart (NotificationBridge.web.tsx): subscribe to the
 * stores, forward each OS button into the same `PlaybackController` entry points the UI uses.
 * Play/pause therefore go through the store
 * and AudioEngine drives the player.
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

  // Enable once, wire the OS buttons, and tear down on unmount.
  useEffect(() => {
    void MediaControl.enableMediaControls({
      capabilities: [
        Command.PLAY,
        Command.PAUSE,
        Command.NEXT_TRACK,
        Command.PREVIOUS_TRACK,
        Command.SEEK,
      ],
      compactCapabilities: [Command.PREVIOUS_TRACK, Command.PLAY, Command.NEXT_TRACK],
    });

    const removeListener = MediaControl.addListener((event) => {
      switch (event.command) {
        case Command.PLAY:
          PlaybackController.resume();
          break;
        case Command.PAUSE:
          PlaybackController.pause();
          break;
        case Command.NEXT_TRACK:
          PlaybackController.skipNext();
          break;
        case Command.PREVIOUS_TRACK:
          PlaybackController.skipPrevious();
          break;
        case Command.SEEK:
          if (typeof event.data?.position === 'number') PlaybackController.seekTo(event.data.position);
          break;
      }
    });

    return () => {
      removeListener();
      void MediaControl.disableMediaControls();
    };
  }, []);

  // Metadata (with artwork and duration) follows the current track.
  useEffect(() => {
    if (!currentTrack || !credentials) return;
    // The downloaded cover when there is one, so the artwork also shows offline.
    const artworkUri = resolveTrackSource(
      currentTrack,
      credentials.serverUrl,
      credentials,
      localSourceDeps(credentials),
    ).artworkUrl;
    void MediaControl.updateMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      duration: currentTrack.duration,
      artwork: artworkUri ? { uri: artworkUri } : undefined,
    });
  }, [currentTrack, credentials]);

  // The OS interpolates the scrubber from the playback rate, so — as on web — seed the position on
  // track/status changes rather than on every position tick.
  useEffect(() => {
    void MediaControl.updatePlaybackState(
      currentTrack ? STATE_FOR_STATUS[status] : PlaybackState.NONE,
      positionRef.current,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by track identity, not the whole object
  }, [currentTrack?.id, status]);

  return null;
}
