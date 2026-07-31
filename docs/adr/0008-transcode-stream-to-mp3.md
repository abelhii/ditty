# 0008 — Transcode streams to MP3 (work around 24-bit silent playback)

**Status**: accepted (bug fix — on-device playback). Relates to `docs/adr/0001-player-state-flows-through-store.md`
(the `AudioEngine` that consumes the stream URL).

## Context

`getStreamUrl` originally asked the Subsonic server for the track's *original* bytes. On a real
Android device this plays 16-bit sources (MP3, 16-bit FLAC) correctly, but **24-bit FLAC — common
in lossless libraries — decodes yet outputs silence**: `react-native-audio-api` 0.13's `<Audio>`
pipeline advances position and fires `onPlay`/`onPositionChange` (so the decoder runs) but no audio
reaches the device output. There is **no error** — `onError` never fires, so the halt-and-surface
path (ADR 0007) can't help, and FFmpeg is already compiled in, so it isn't a missing-codec problem.
The failure is specific to 24-bit PCM output.

Diagnosed empirically: an MP3 track played with audio and a climbing seeker; three 24-bit FLAC
tracks loaded, "played" (position ticked), and were silent. Reading the FLAC `STREAMINFO` confirmed
44.1 kHz / **24-bit** / stereo.

## Decision

Transcode to **MP3** (`format=mp3`, `maxBitRate=320`) **on native only**; stream the original file
untouched on **web**. MP3 is inherently 16-bit, universally decodable by the library, and
Navidrome/Subsonic transcodes on the fly and still serves the result over range requests (seekable).
Rather than probe each file's bit depth client-side, transcode unconditionally *on native* — one URL
change, no per-track branching, and 320 kbps is near-transparent.

Web is exempted because the browser's `<audio>` decodes FLAC (incl. 24-bit) natively and losslessly
— the same reason Feishin's web backend needs no transcoding, and confirmed by our own web build
playing these files before this change. iOS is transcoded conservatively alongside Android: its
`react-native-audio-api` 24-bit behaviour is untested, so it defaults to the safe (playable) path
until verified; relax it to Android-only if iOS turns out to play 24-bit.

This is the only change; the reactive player architecture (ADR 0001) is untouched — `AudioEngine`
still just consumes whatever URL `getStreamUrl` returns.

## Consequences

- **Trade-off: lossy playback.** A lossless library is streamed as 320 kbps MP3. Acceptable because
  the alternative is *no audio* for 24-bit files, and mobile streaming to a phone is not a critical
  listening context.
- **Server CPU / bandwidth**: on-the-fly transcoding costs the server some CPU; bandwidth generally
  drops (320 kbps MP3 « 24-bit FLAC).
- **Revisit if the library gains 24-bit output.** The clean end state is `format=raw` (bit-perfect,
  no transcode) once `react-native-audio-api` plays 24-bit on Android, ideally gated behind a
  user "lossless / data-saver" setting rather than hard-coded.

## Related

- Playback also required dropping the AudioContext **graph** routing (silent on Android) in favour
  of standalone `<Audio>` output, and a `key`-per-track remount to force the library's *pausing*
  teardown on track switch. Both are documented inline in `src/player/AudioEngine.tsx`.
