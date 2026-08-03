import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";

import {
  CoverArtSize,
  getCoverArtUrl,
  getStreamUrl,
} from "@/api/subsonic/endpoints/media";
import { useAuthStore } from "@/auth/use-auth-store";
import * as PlaybackController from "@/player/PlaybackController";
import { getCurrentTrack } from "@/player/QueueManager";
import { usePlaybackStatusStore } from "@/player/use-playback-status-store";
import { usePlayerStore } from "@/player/use-player-store";
import { isOffline } from "@/utils/network";

/**
 * The only module that touches the audio player directly. Mount once per authenticated session
 * (app/_layout.tsx). Reads proposed state from `usePlayerStore`, drives expo-audio imperatively,
 * and writes observed facts back — the contract in ADR 0001, now on expo-audio (ADR 0009: bit-perfect
 * FLAC, no MP3 transcode).
 *
 * Non-obvious points forced by expo-audio's API:
 *
 * 1. The player is created once with a `null` source and driven by `player.replace()` on track change.
 *    `useAudioPlayer(source)` recreates the native player on every source change, churning the
 *    lock-screen registration and buffers on each skip.
 *
 * 2. Lock-screen controls live here on native (NotificationBridge is a no-op there). expo-audio owns
 *    the OS controls via `setActiveForLockScreen` — play/pause/seek handled natively, no JS round-trip.
 *    It surfaces no next/previous buttons and no reliable way to add them was found (ADR 0009). Web
 *    uses its own Media Session bridge (NotificationBridge.web.tsx), so skip this API there.
 *
 * 3. Native lock-screen play/pause bypasses PlaybackController, so the status effect reconciles
 *    `desiredPlaying` to the player's real state once settled — else a lock-screen pause leaves the
 *    in-app toggle out of phase.
 *
 * 4. Repeat-one uses native `loop`, not re-cueing on end — gapless, and avoids `next()` returning the
 *    same index (QueueManager.next).
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
  // Track whose `didJustFinish` we've already handled, so a run of end-of-track ticks advances once.
  const endedTrackId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // `doNotMix` lets the lock-screen controls bind to our player; background playback keeps audio
    // alive when backgrounded / locked.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  // Load the current track (and re-load on retry). play() tolerates being called before buffering
  // finishes, so start here; the status effect below reports the real loading → playing/paused states.
  useEffect(() => {
    endedTrackId.current = undefined;

    if (!currentTrack || !credentials) {
      // No `replace(null)`: expo-audio's `replace` rejects null on Android, and the API has no
      // unload/stop, so pause instead — the last source stays loaded but silent when the queue empties.
      player.pause();
      usePlaybackStatusStore.getState().setStatus("idle");
      return;
    }

    usePlaybackStatusStore.getState().setStatus("loading");
    player.replace({
      uri: getStreamUrl(credentials.serverUrl, currentTrack.id, credentials),
    });

    if (Platform.OS !== "web") {
      player.setActiveForLockScreen(true, {
        title: currentTrack.title,
        artist: currentTrack.artist,
        albumTitle: currentTrack.album,
        artworkUrl: getCoverArtUrl(
          credentials.serverUrl,
          currentTrack.coverArtId,
          credentials,
          CoverArtSize.detail,
        ),
      });
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
    // Assigning `loop` is the documented API for gapless repeat-one (lint can't see through the
    // mutable native SharedObject).
    // eslint-disable-next-line react-hooks/immutability
    player.loop = queue.repeat === "one";
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
      // Halt rather than auto-advance: offline, every track fails, so auto-skip would blast through
      // the queue (ADR 0007). The connectivity probe is async, so the wording lands after the halt.
      usePlaybackStatusStore.getState().reportError();
      isOffline().then((offline) =>
        usePlaybackStatusStore.getState().setErrorOffline(offline),
      );
      return;
    }

    if (status.didJustFinish && endedTrackId.current !== currentTrack.id) {
      endedTrackId.current = currentTrack.id;
      PlaybackController.handleTrackEnded();
      return;
    }

    if (!status.isLoaded || status.isBuffering) {
      usePlaybackStatusStore.getState().setStatus("loading");
      return;
    }

    usePlaybackStatusStore.getState().setPosition(status.currentTime);
    usePlaybackStatusStore
      .getState()
      .setStatus(status.playing ? "playing" : "paused");

    // Mirror a lock-screen / OS-interruption play/pause that bypassed PlaybackController back into
    // proposed state, keeping the in-app transport in phase. No feedback loop: the play/pause effect
    // only issues idempotent calls against the already-current native state.
    if (status.playing !== usePlayerStore.getState().desiredPlaying) {
      usePlayerStore.setState({ desiredPlaying: status.playing });
    }
  }, [status, currentTrack]);

  return null;
}
