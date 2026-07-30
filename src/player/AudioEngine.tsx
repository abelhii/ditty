import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { Audio, AudioContext, AudioManager, type AudioTagHandle } from 'react-native-audio-api';

import { getStreamUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/useAuthStore';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';

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
          audioRef.current?.play();
        } else {
          usePlaybackStatusStore.getState().setStatus('paused');
        }
      }}
      onError={() => usePlaybackStatusStore.getState().setStatus('stopped')}
      onPlay={() => usePlaybackStatusStore.getState().setStatus('playing')}
      onPause={() => usePlaybackStatusStore.getState().setStatus('paused')}
      onEnded={() => PlaybackController.handleTrackEnded()}
      onPositionChange={(seconds) => usePlaybackStatusStore.getState().setPosition(seconds)}
    />
  );
}
