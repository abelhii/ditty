# 0009 — Move playback to expo-audio for bit-perfect lossless

**Status**: accepted (spike, branch `spike/expo-audio-lossless`, 2026-08-01). Supersedes
`docs/adr/0008-transcode-stream-to-mp3.md`; extends `docs/adr/0001-player-state-flows-through-store.md`
(the reactive player architecture, unchanged in shape). Not yet validated on device — see Open
questions.

## Context

`react-native-audio-api` was chosen (PLAN.md Tech Stack) primarily for its Web Audio node graph as a
foundation for a future EQ. That graph turned out to be **silent on Android** and was removed; playback
already runs through a standalone `<Audio>` element with no graph. So the main reason to stay was gone.

Two problems remained on that backend, both on-device:

- **24-bit FLAC decoded to silence on Android**, forcing an unconditional MP3 transcode on native
  (ADR 0008). A lossless library was streamed lossy, and the server-side transcode adds per-track
  latency ("the app feels slow").
- **Lock-screen controls were half-working** (no artwork; stale position on track change — PLAN.md
  "Known issues / polish backlog").

expo-audio is SDK 57's first-party audio module, backed by **ExoPlayer/Media3 on Android** and
**AVFoundation on iOS** — both decode FLAC natively — with built-in background audio and lock-screen
integration. This ADR records migrating onto it.

## Decision

Replace `react-native-audio-api` with **expo-audio** as the playback backend. Contained to the player
layer; the store-driven architecture (ADR 0001: `PlaybackController` writes proposed state,
`AudioEngine` drives the player and writes back observed facts) is preserved.

- **`AudioEngine.tsx`** now holds a single `useAudioPlayer(null)` instance and drives it imperatively:
  `player.replace({ uri })` on track change (the hook *recreates* the native player if the source is
  passed as its argument, so we create once and replace), `play`/`pause` from `desiredPlaying`,
  `seekTo` from `seekRequest`. Observed status comes from `useAudioPlayerStatus` and is written into
  `usePlaybackStatusStore`.
- **Lock-screen controls move into `AudioEngine`** (native only), because expo-audio exposes them on
  the *player instance* (`setActiveForLockScreen(active, metadata, options)`), not as a standalone
  module. This fixes both polish bugs for free: expo-audio loads `artworkUrl` and resets position per
  source.
- **Next/previous-track on the lock screen is restored via a local patch.** Stock expo-audio's OS
  controls are play/pause/seek only — both platforms strip track navigation. We carry a
  `pnpm patch` (`patches/expo-audio@57.0.3.patch`, adapted from the workaround in
  [expo/expo#43538](https://github.com/expo/expo/issues/43538), which targets v55) that adds
  `showNextTrack`/`showPreviousTrack` to `AudioLockScreenOptions` and emits
  `onRemoteNextTrack`/`onRemotePreviousTrack` on the player. `AudioEngine` enables both and forwards
  the events into `PlaybackController.skipNext/skipPrevious`. If the patch is ever dropped, the
  buttons just stop appearing — nothing else breaks.
- **`NotificationBridge` becomes a native no-op.** Its web counterpart (`NotificationBridge.web.tsx`,
  the browser Media Session bridge) is unchanged and still mounted; only native lock-screen handling
  moved into `AudioEngine`.
- **`getStreamUrl` streams `format=raw`** (bit-perfect) on every platform — the MP3 transcode (ADR
  0008) is deleted. A user-selectable "data saver" that re-adds `format=mp3` is a clean later
  follow-up.
- **Repeat-one uses the player's native `loop`** rather than re-cueing on end (`QueueManager.next`
  returns the same index for repeat-one, so an end-driven advance is a no-op there).
- Config: `expo-audio` config plugin added (playback-only — `recordAudioAndroid: false`,
  `microphonePermission: false`, so no microphone/RECORD_AUDIO), `react-native-audio-api` plugin and
  dependency removed. `setAudioModeAsync({ playsInSilentMode, shouldPlayInBackground, interruptionMode:
  'doNotMix' })` on mount (`doNotMix` is required for the lock-screen controls to bind).

## Consequences

- **Lossless.** Native plays the original FLAC bit-perfect; no server transcode, so no per-track
  transcode latency.
- **Lock-screen next/previous requires carrying a patch.** Stock expo-audio supports only
  **play / pause / seek** (+ optional 10s skip); both platforms strip next/previous (iOS wires no
  `nextTrackCommand`; Android `AudioMediaSessionCallback` removes `COMMAND_SEEK_TO_NEXT/PREVIOUS…`).
  The MVP control set (play/pause/**nextTrack/previousTrack**/seekTo, PLAN.md Build Order step 3)
  needs them, so we carry `patches/expo-audio@57.0.3.patch` (see the Decision). **Cost:** a native
  (Kotlin + Swift) patch against a first-party module, which can break on any expo-audio upgrade and
  must be re-verified then — the recurring tax for keeping the first-party backend *and* full
  controls. The clean exit is Expo shipping this upstream (the issue is assigned); drop the patch when
  they do. Web keeps next/previous via its own Media Session bridge.
- **Lock-screen play/pause bypasses `PlaybackController`.** Because the OS controls drive the native
  player directly, `AudioEngine`'s status subscription **reconciles** `desiredPlaying` to the player's
  observed `playing` once settled (loaded, not buffering), keeping the in-app transport in phase.
- **Audio-focus interruption handling is coarser.** The old explicit `AudioManager` interruption
  subscription (auto-pause, auto-resume only if the OS signals `shouldResume`) is gone; expo-audio
  pauses natively on interruption and we mirror that into `desiredPlaying`, but we no longer auto-resume
  after the interruption ends (user resumes manually). Acceptable for the spike.
- **The Web Audio EQ foundation is fully abandoned** (already lost on Android). A future EQ needs a
  native-backed approach (ExoPlayer/Media3 audio processors) — noted in PLAN.md's EQ entry.
- **Requires a native rebuild** (`expo prebuild --clean` + `expo run:android`/`run:ios`) — a new native
  module and a removed one.

## Open questions (validate on device — the point of the spike)

- ExoPlayer/Media3 actually decodes the target **24-bit FLAC** on the real Android hardware, and
  AVFoundation on iOS (Media3 generally supports it, but device decoders vary).
- Lock-screen renders artwork and a correct per-track position on the new backend.
- Interruption / audio-focus behaviour is acceptable without the explicit auto-resume.
- **The next/previous patch actually compiles and works on device** — the patch was hand-ported to
  v57's diverged source and can't be verified without a native build (Kotlin/Swift don't run in CI
  here). If it fails to build or the buttons don't fire, park it (remove the patch entry from
  `package.json` + `patches/`) and revisit when Expo ships #43538 upstream.

## Related

- Supersedes `docs/adr/0008-transcode-stream-to-mp3.md`.
- `docs/adr/0001-player-state-flows-through-store.md` — the reactive architecture this preserves.
- PLAN.md — the "⭐ High-priority spike: evaluate expo-audio" entry this spike executes.
