import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { CoverArtSize, getCoverArtUrl, getStreamUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/useAuthStore';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';
import { isOffline } from '@/utils/network';

/**
 * The only module that touches the audio player directly. Mount once, persistently, for the life of
 * an authenticated session (see app/_layout.tsx). Subscribes to `usePlayerStore`'s proposed state,
 * drives expo-audio imperatively, and writes observed facts back — the reactive-vs-imperative
 * contract in docs/adr/0001-player-state-flows-through-store.md, now on expo-audio (ExoPlayer/Media3
 * on Android, AVFoundation on iOS, `<audio>` on web) instead of react-native-audio-api. See
 * docs/adr/0009-expo-audio-lossless.md for why (bit-perfect FLAC, no MP3 transcode) and the
 * lock-screen trade-off this backend forces.
 *
 * Non-obvious points forced by expo-audio's API:
 *
 * 1. The player is created **once** with a `null` source and driven by `player.replace()` on track
 *    change. `useAudioPlayer(source)` recreates the underlying native player whenever the source
 *    changes, which would churn the lock-screen registration and native buffers on every skip.
 *
 * 2. **Lock-screen controls live here on native**, not in NotificationBridge (which is a no-op on
 *    native — see that file). expo-audio owns the OS controls through the *player instance*
 *    (`setActiveForLockScreen`): play/pause/seek are handled natively without a JS round-trip.
 *    Stock expo-audio drops next/previous-track; we restore them via a local patch (expo/expo#43538,
 *    see patches/expo-audio+57.0.3.patch and ADR 0009), which emits `onRemoteNextTrack`/
 *    `onRemotePreviousTrack` on the player — forwarded into PlaybackController below. If that patch
 *    is ever dropped, the buttons simply stop appearing; nothing else breaks. Web keeps its own
 *    Media Session bridge (NotificationBridge.web.tsx), so we skip expo-audio's lock-screen API there.
 *
 * 3. Because native lock-screen play/pause bypasses PlaybackController, the status subscription
 *    **reconciles** `desiredPlaying` to what the player actually reports once it's settled (loaded,
 *    not buffering) — otherwise a lock-screen pause would leave `desiredPlaying` stuck `true` and the
 *    in-app play/pause toggle a beat out of phase.
 *
 * 4. Repeat-one uses the player's native `loop` rather than re-cueing on end — gapless, and it
 *    sidesteps `next()` returning the same track index for repeat-one (QueueManager.next).
 */
export function AudioEngine() {
  const credentials = useAuthStore((state) => state.credentials);
  const queue = usePlayerStore((state) => state.queue);
  const desiredPlaying = usePlayerStore((state) => state.desiredPlaying);
  const seekRequest = usePlayerStore((state) => state.seekRequest);
  const retryNonce = usePlayerStore((state) => state.retryNonce);

  const player = useAudioPlayer(null, { updateInterval: 1000 });
  const status = useAudioPlayerStatus(player);

  const currentTrack = getCurrentTrack(queue);
  // The track we've already routed `didJustFinish` through, so a run of end-of-track status ticks
  // advances the queue exactly once.
  const endedTrackId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // `doNotMix` is required for the lock-screen controls to bind to our player; background playback
    // keeps audio alive when the app is backgrounded / the screen locks.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    // Android 13+ (API 33) suppresses the media notification unless POST_NOTIFICATIONS is granted —
    // and on Android that notification *is* the lock-screen + shade transport. expo-audio's service
    // runs regardless, but its controls stay hidden without this. Request once on mount; a prior
    // grant resolves without prompting. No-op on iOS (lock-screen controls there don't need it) and
    // on API < 33 (the permission is install-time / auto-granted).
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
  }, []);

  // Forward the patched-in next/previous lock-screen presses into the queue (expo/expo#43538 — see
  // the component doc). These event names aren't in expo-audio's typed AudioEvents, so we reach the
  // SharedObject's `addListener` through a narrow cast; on web (unpatched) they simply never fire.
  useEffect(() => {
    const remote = player as unknown as {
      addListener: (event: string, listener: () => void) => { remove: () => void };
    };
    const subscriptions = [
      remote.addListener('onRemoteNextTrack', () => PlaybackController.skipNext()),
      remote.addListener('onRemotePreviousTrack', () => PlaybackController.skipPrevious()),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [player]);

  // Load the current track (and re-load on retry). expo-audio's play() is tolerant of being called
  // before the source finishes buffering, so we start playback here rather than waiting on a load
  // callback; the status effect below reports the real 'loading' → 'playing'/'paused' transitions.
  useEffect(() => {
    endedTrackId.current = undefined;

    if (!currentTrack || !credentials) {
      // No `replace(null)` here: expo-audio's native `replace` binds a non-nullable AudioSource and
      // rejects null on Android ("Cannot assign null to not nullable type"). There's no unload/stop in
      // the API, so we pause — the last source stays loaded but silent, which is the intended state
      // when the queue empties.
      player.pause();
      if (Platform.OS !== 'web') player.clearLockScreenControls();
      usePlaybackStatusStore.getState().setStatus('idle');
      return;
    }

    usePlaybackStatusStore.getState().setStatus('loading');
    player.replace({ uri: getStreamUrl(credentials.serverUrl, currentTrack.id, credentials) });

    if (Platform.OS !== 'web') {
      player.setActiveForLockScreen(
        true,
        {
          title: currentTrack.title,
          artist: currentTrack.artist,
          albumTitle: currentTrack.album,
          artworkUrl: getCoverArtUrl(
            credentials.serverUrl,
            currentTrack.coverArtId,
            credentials,
            CoverArtSize.detail,
          ),
        },
        // Patched-in next/previous buttons (see the component doc + patches/).
        { showNextTrack: true, showPreviousTrack: true },
      );
    }

    if (usePlayerStore.getState().desiredPlaying) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by track identity, not the whole object
  }, [player, currentTrack?.id, retryNonce, credentials]);

  useEffect(() => {
    if (!currentTrack) return;
    if (desiredPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, desiredPlaying, currentTrack]);

  useEffect(() => {
    // expo-audio players are mutable native handles; assigning `loop` is the documented API for
    // native gapless repeat-one (the React Compiler lint can't see through the SharedObject).
    // eslint-disable-next-line react-hooks/immutability
    player.loop = queue.repeat === 'one';
  }, [player, queue.repeat]);

  useEffect(() => {
    if (seekRequest === null) return;
    player.seekTo(seekRequest);
    usePlayerStore.getState().clearSeekRequest();
  }, [player, seekRequest]);

  // The sole writer of observed playback facts back into the stores.
  useEffect(() => {
    if (!currentTrack) return;

    if (status.error) {
      // Halt on the current track rather than auto-advancing (offline, every track fails, so
      // auto-skip would blast through the queue — ADR 0007). The connectivity probe is async, so
      // the offline/bad-stream wording lands a beat after the halt.
      usePlaybackStatusStore.getState().reportError();
      isOffline().then((offline) => usePlaybackStatusStore.getState().setErrorOffline(offline));
      return;
    }

    if (status.didJustFinish && endedTrackId.current !== currentTrack.id) {
      endedTrackId.current = currentTrack.id;
      PlaybackController.handleTrackEnded();
      return;
    }

    if (!status.isLoaded || status.isBuffering) {
      usePlaybackStatusStore.getState().setStatus('loading');
      return;
    }

    usePlaybackStatusStore.getState().setPosition(status.currentTime);
    usePlaybackStatusStore.getState().setStatus(status.playing ? 'playing' : 'paused');

    // Mirror a lock-screen (or OS-interruption) play/pause that bypassed PlaybackController back into
    // the proposed state, so the in-app transport stays in phase. Safe from a feedback loop: the
    // play/pause effect only issues idempotent calls against the already-current native state.
    if (status.playing !== usePlayerStore.getState().desiredPlaying) {
      usePlayerStore.setState({ desiredPlaying: status.playing });
    }
  }, [status, currentTrack]);

  return null;
}
