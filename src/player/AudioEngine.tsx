import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { Audio, AudioContext, AudioManager, type AudioTagHandle } from 'react-native-audio-api';

import { getStreamUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/useAuthStore';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';
import { isOffline } from '@/utils/network';

/**
 * The only module that touches the `<Audio>` ref / AudioContext graph directly. Mount once,
 * persistently, for the life of an authenticated session (see app/_layout.tsx). Subscribes to
 * `usePlayerStore`'s proposed state and writes observed facts back — see
 * docs/adr/0001-player-state-flows-through-store.md for the reactive-vs-imperative rationale.
 */
export function AudioEngine() {
  const credentials = useAuthStore((state) => state.credentials);
  const queue = usePlayerStore((state) => state.queue);
  const desiredPlaying = usePlayerStore((state) => state.desiredPlaying);
  const seekRequest = usePlayerStore((state) => state.seekRequest);
  const retryNonce = usePlayerStore((state) => state.retryNonce);

  const [audioContext] = useState(() => new AudioContext());
  const audioRef = useRef<AudioTagHandle>(null);
  const hasRoutedGraph = useRef(false);
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
      // <Audio> is about to unmount below — the next track will get a fresh native instance.
      hasRoutedGraph.current = false;
      loadedTrackId.current = undefined;
      usePlaybackStatusStore.getState().setStatus('idle');
    } else if (currentTrack.id !== loadedTrackId.current) {
      usePlaybackStatusStore.getState().setStatus('loading');
    }
  }, [currentTrack]);

  useEffect(() => {
    // A track switch is handled by onLoad below, once the new source has actually finished
    // loading — this effect only reacts to play/pause toggles on an already-loaded track.
    if (!currentTrack || loadedTrackId.current !== currentTrack.id) return;

    if (desiredPlaying) {
      // Android constructs the AudioContext *suspended*, which mutes the whole graph
      // (source → gain → destination): the element loads and play() fires but no sound reaches
      // the speakers. resume() is a no-op once the context is running (iOS, and the graph
      // validated in PLAN.md step 0), so it's safe to call before every play; fire-and-forget so
      // the element starts regardless of when the resume promise settles.
      void audioContext.resume();
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
    }
  }, [desiredPlaying, currentTrack, audioContext]);

  useEffect(() => {
    if (seekRequest === null) return;
    audioRef.current?.seekToTime(seekRequest);
    usePlayerStore.getState().clearSeekRequest();
  }, [seekRequest]);

  if (!currentTrack || !credentials) {
    return null;
  }

  // A retry re-fetches the *same* track: appending the nonce changes the source string so `<Audio>`
  // reloads without remounting (a remount would rebuild the native AudioContext graph — see onLoad).
  const streamUrl = getStreamUrl(credentials.serverUrl, currentTrack.id, credentials);
  const source = retryNonce > 0 ? `${streamUrl}&_retry=${retryNonce}` : streamUrl;

  return (
    <Audio
      ref={audioRef}
      source={source}
      context={audioContext}
      onLoad={() => {
        // Web's <Audio> ref is a plain {play, pause, ...} facade, not the real <audio> element
        // underneath — there's no way to route it through an AudioContext graph on web with
        // this library version (the `context` prop is accepted but unused there). Native only.
        if (!hasRoutedGraph.current && audioRef.current && Platform.OS !== 'web') {
          const sourceNode = audioContext.createMediaElementSource(audioRef.current);
          const gain = audioContext.createGain();
          sourceNode.connect(gain);
          gain.connect(audioContext.destination);
          hasRoutedGraph.current = true;
        }

        loadedTrackId.current = currentTrack.id;
        if (usePlayerStore.getState().desiredPlaying) {
          // Resume a suspended (Android) AudioContext before playing — see the desiredPlaying effect.
          void audioContext.resume();
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
