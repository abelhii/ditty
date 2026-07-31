import { useEffect, useRef } from 'react';

import { Audio, AudioManager, type AudioTagHandle } from 'react-native-audio-api';

import { getStreamUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/useAuthStore';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';
import { isOffline } from '@/utils/network';

/**
 * The only module that touches the `<Audio>` ref directly. Mount once, persistently, for the life
 * of an authenticated session (see app/_layout.tsx). Subscribes to `usePlayerStore`'s proposed
 * state and writes observed facts back — see docs/adr/0001-player-state-flows-through-store.md for
 * the reactive-vs-imperative rationale.
 *
 * Two non-obvious decisions, both forced by react-native-audio-api 0.13's Audio tag:
 *
 * 1. The element plays on its own native output — we deliberately do *not* route it through an
 *    AudioContext graph (`createMediaElementSource` → gain → destination), which is silent on
 *    Android. Standalone playback is the library's documented default and plays every format the OS
 *    decodes, FLAC included. (A future EQ will need a different insertion point; see PLAN.md.)
 *
 * 2. The `key` on `<Audio>` is load-bearing. `<Audio>`'s *source-change* teardown disposes the old
 *    file source but never pauses it (its *unmount* teardown does), so swapping the `source` prop
 *    alone leaves the previous track audibly playing and stacks overlapping streams on every skip.
 *    Keying by track forces a full unmount/remount per switch, running the teardown that *does*
 *    pause — so exactly one stream plays at a time.
 */
export function AudioEngine() {
  const credentials = useAuthStore((state) => state.credentials);
  const queue = usePlayerStore((state) => state.queue);
  const desiredPlaying = usePlayerStore((state) => state.desiredPlaying);
  const seekRequest = usePlayerStore((state) => state.seekRequest);
  const retryNonce = usePlayerStore((state) => state.retryNonce);

  const audioRef = useRef<AudioTagHandle>(null);
  // The track id `<Audio>` has actually finished loading — as opposed to `currentTrack`,
  // which flips the instant PlaybackController proposes a new one.
  const loadedTrackId = useRef<string | undefined>(undefined);

  const currentTrack = getCurrentTrack(queue);

  useEffect(() => {
    AudioManager.observeAudioInterruptions(true);
    const subscription = AudioManager.addSystemEventListener('interruption', (event) => {
      if (event.type === 'began') {
        PlaybackController.pause();
      } else if (event.shouldResume) {
        PlaybackController.resume();
      }
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (!currentTrack) {
      loadedTrackId.current = undefined;
      usePlaybackStatusStore.getState().setStatus('idle');
    } else if (currentTrack.id !== loadedTrackId.current) {
      usePlaybackStatusStore.getState().setStatus('loading');
    }
  }, [currentTrack]);

  useEffect(() => {
    // A track switch is handled by onLoad below, once the freshly-mounted <Audio> has loaded — this
    // effect only reacts to play/pause toggles on the already-loaded current track.
    if (!currentTrack || loadedTrackId.current !== currentTrack.id) return;

    if (desiredPlaying) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
    }
  }, [desiredPlaying, currentTrack]);

  useEffect(() => {
    if (seekRequest === null) return;
    audioRef.current?.seekToTime(seekRequest);
    usePlayerStore.getState().clearSeekRequest();
  }, [seekRequest]);

  if (!currentTrack || !credentials) {
    return null;
  }

  const source = getStreamUrl(credentials.serverUrl, currentTrack.id, credentials);

  return (
    <Audio
      // Remount per track (and per retry) so the previous source is *paused*, not just disposed —
      // see the component doc above. `retryNonce` bumps on PlaybackController.retry() to force a
      // fresh reload of the same track after a playback error (ADR 0007).
      key={`${currentTrack.id}:${retryNonce}`}
      ref={audioRef}
      source={source}
      onLoad={() => {
        loadedTrackId.current = currentTrack.id;
        if (usePlayerStore.getState().desiredPlaying) {
          audioRef.current?.play();
        } else {
          usePlaybackStatusStore.getState().setStatus('paused');
        }
      }}
      onError={() => {
        // Halt on the current track rather than silently stopping or auto-advancing (offline, every
        // track fails, so auto-skip would blast through the queue — ADR 0007). The <Audio> onError
        // is opaque (no code/class), so a connectivity probe is the only way to word it offline vs.
        // a genuinely bad stream; it's async, so the reason lands a beat after the halt.
        usePlaybackStatusStore.getState().reportError();
        isOffline().then((offline) => usePlaybackStatusStore.getState().setErrorOffline(offline));
      }}
      onPlay={() => usePlaybackStatusStore.getState().setStatus('playing')}
      onPause={() => usePlaybackStatusStore.getState().setStatus('paused')}
      onEnded={() => PlaybackController.handleTrackEnded()}
      onPositionChange={(seconds) => usePlaybackStatusStore.getState().setPosition(seconds)}
    />
  );
}
