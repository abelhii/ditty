# Subsonic/Navidrome Music Player — Project Plan

React Native (Expo) music player client for Subsonic/Navidrome servers.

This plan was stress-tested via a grilling session on 2026-07-26. Every deviation from
the original draft is called out explicitly below, with the reasoning behind it.

---

## Tech Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Expo (dev client, not Expo Go) | Fast iteration, but native modules require a custom dev client build. **Local prebuild** (`expo prebuild` + `expo run:ios`/`run:android`) is the default iteration loop; EAS dev builds are a fallback for testing on a device away from the dev machine. |
| Navigation | Expo Router | File-based. Lives under `src/app/`, matching this repo's existing `src/`-scoped scaffold — **not** a root-level `app/` as originally drafted. |
| Playback | `react-native-audio-api` (MIT, Software Mansion) | **Not** `react-native-track-player` — v5 is commercially licensed (free for personal/educational use only, paid for commercial apps); v4 is Apache-2.0 but frozen/unmaintained. `react-native-audio-api` is a Web Audio API–style engine: MIT licensed, ships an Expo config plugin and a `PlaybackNotificationManager` for lock-screen/notification controls, and its node-graph model doubles as the foundation for a future EQ. Its New Architecture maturity isn't clearly documented — this is the single riskiest bet in the plan, hence validated first (see Build Order). Trade-off: it's a low-level audio primitive library, not a purpose-built player — queue management, gapless logic, and playback state have to be built on top. |
| App state | Zustand | Lightweight, good for player/UI state |
| Server data | TanStack Query (React Query) | Orchestrates fetch/refetch/retry against the Subsonic API. **Revised (2026-07-26, step 4 grilling session)**: TanStack Query's own cache *is* the cache of record for library browsing — no local database mirror underneath it. See Local persistence and Build Order step 4. |
| Local persistence | **TanStack Query's persisted cache** is the local library cache — no SQLite schema | **Decided 2026-07-26, step 4 grilling session** (full rationale: `docs/adr/0002-no-local-library-mirror.md`): the original plan called for a full SQLite mirror of the catalog as source of truth, synced incrementally. Reversed after finding the Subsonic API has no incremental-fetch primitive for ID3 data, and that a real client (tempus, a fork of Tempo) doesn't mirror the catalog locally at all — it hits the network live per screen and only persists things that need genuine local durability. Persisted via `@tanstack/react-query-persist-client` + `createAsyncStoragePersister`, backed by a platform-branched key-value adapter — `expo-sqlite/kv-store` on native (first-party, sync API), `localStorage` on web (avoids `expo-sqlite`'s web support, which is alpha and needs WASM + cross-origin isolation headers). This KV mechanism is also the app's one general-purpose local key-value store (recent searches, settings), replacing the original MMKV pick. **Queue/position persistence (2026-07-26, step 3 grilling session)**: Navidrome/Subsonic implements the Subsonic API's `getPlayQueue`/`savePlayQueue` (server-side, cross-device — `current` comes back as a string ID on Navidrome, not the `int` the spec describes), which is the primary mechanism for restart/cross-device queue recovery. Exact design (server-first vs. local-cache-plus-sync) is deferred to step 8, not step 3 — see Build Order. |
| Secrets | `expo-secure-store` on iOS/Android; `localStorage` on web (branched via `Platform.OS`), storing **`{username, salt, token}` only — never the plaintext password** | Subsonic's token scheme (`token = md5(password + salt)`) doesn't require a fresh salt per session; one salt/token pair generated at login can be reused indefinitely. Storing the raw password would be a bigger blast radius on device compromise than storing a server-scoped token. Password is held in memory only during the login flow, re-prompted only on explicit re-login (e.g. token rejected, password changed server-side). **Web caveat**: browsers have no equivalent to Keychain/Keystore accessible to a client-side SPA — `localStorage` is plaintext and readable by any script on the page (XSS-exposed). Accepted trade-off for web, decided 2026-07-26: the blast radius is still bounded to a revocable token (never the password), same as native, just without at-rest encryption. |
| API layer | Hand-rolled Subsonic REST client | Simple param+token API; no heavy SDK needed. `computeToken` branches on `Platform.OS`: native uses `expo-crypto`'s `digestStringAsync` (MD5), web uses the pure-JS `js-md5` package, since browsers' WebCrypto `SubtleCrypto.digest()` doesn't implement MD5 at all (excluded from the spec as insecure). |

**Platform scope: mobile-first (iOS/Android), with web supported where feasible.** `react-native-web`
is present in the scaffold and is now a real (if secondary) target, starting with auth — see the
Secrets row above for the storage caveat. Web support for playback (`react-native-audio-api`'s web
support is unverified) and lock-screen/notification integration is still undecided and should be
evaluated per-subsystem as each is built, not assumed.

---

## File Structure

Everything nests under `src/`, matching the existing scaffold (this repo already has
`src/app/`, `src/components/`, `src/hooks/`, `src/constants/` — the original draft's
root-level `app/` was a mismatch, not an intentional restructure).

```
src/
  app/                          # expo-router screens — flat, top-level route files, not a (tabs)
                                 # group; NativeTabs is mounted directly in _layout.tsx (see
                                 # components/app-tabs.tsx) — a divergence from this draft caught
                                 # and corrected during the step 5 grilling session (2026-07-27)
    index.tsx                   # home/discover (currently: build-order-step-4 smoke-test screen)
    library.tsx                 # step 5: sectioned artists list. step 7 drops this as a *tab*
                                 #   (Home links to Artists/Albums instead); the route stays
    search/                     # step 6: own nested stack (mirrors library/), reuses the
      index.tsx                 #   step-5 detail screens via a basePath prop
      artist/[id].tsx
      album/[id].tsx
    my-music.tsx                # step 7b: My Music tab — playlists list + pinned Favourites
    settings.tsx                # step 5: logout button
    album/[id].tsx              # step 5
    artist/[id].tsx             # step 5
    genre/[name].tsx            # step 5: paginated albums-by-genre
    playlist/[id].tsx           # step 7b: playlist detail (tracks + play + edit)
    _layout.tsx                 # step 7a: mounts MiniPlayer + now-playing + queue overlays above
                                 #   NativeTabs. now-playing/queue are JS overlays (features/player/
                                 #   components/), NOT router routes: NativeTabs is the root navigator
                                 #   and can't host modal routes without a root Stack — see ADR 0005

  api/
    subsonic/
      client.ts               # low-level fetch wrapper, auth/signing
      endpoints/
        browsing.ts           # getArtists, getArtist, getAlbum, getGenres, getPlaylists, getAlbumsByGenre (step 5)
        search.ts
        playlists.ts          # step 7b: getPlaylists/getPlaylist/create/update/deletePlaylist
        media.ts               # stream/download URL builders, getCoverArtUrl (step 5)
        annotations.ts        # step 7b: star/unstar (+ getStarred2); scrobble/rating later
      types.ts
      errors.ts
    types.ts                    # normalized app-level models (Track, Artist, Album, Genre, ArtistSection...);
                                 #   step 7b adds a `starred` flag to Track/Artist/Album
    normalize.ts               # pure functions: raw Subsonic shapes -> normalized models (unit tested)
    kvStorage.ts               # platform-branched sync KV adapter: expo-sqlite/kv-store (native) / localStorage (web)
    queryClient.ts             # QueryClient + persister setup, built on kvStorage.ts (see Build Order step 4)

  player/
    AudioEngine.ts             # AudioContext lifecycle, source node setup, connects to destination
    PlaybackController.ts     # play/pause/seek/skip — the "public API" the rest of the app calls
    QueueManager.ts           # queue state, next/prev logic, shuffle algorithm, repeat modes (unit tested)
    NotificationBridge.ts     # wraps PlaybackNotificationManager, syncs OS controls <-> playback state
    streamSource.ts           # builds the correct source node for a Subsonic stream URL
    usePlayerStore.ts         # zustand store: queue, shuffle, repeat, position, playback status
    hooks/
      usePlaybackState.ts
      useProgress.ts

  features/
    library/                  # step 5
      hooks/                  # useArtists, useArtist, useAlbum, useGenres, useAlbumsByGenre — read
                               # credentials from useAuthStore internally, no serverUrl/auth props
      components/             # orchestration: screen-level components calling the hooks above,
                               # composing components/'s shared molecules, wiring taps to PlaybackController
    search/                   # step 6
      hooks/                  # useSearch (debounced search3), useRecentSearches (kvStorage-backed)
      components/SearchScreen.tsx  # sectioned combined-results scroll + recent searches
    playlists/                # step 7b
      hooks/ (usePlaylists, usePlaylist, useCreatePlaylist, useUpdatePlaylist,
               useDeletePlaylist, useAddToPlaylist)
      components/ (My Music landing, PlaylistDetailScreen)
    favourites/               # step 7b
      hooks/ (useFavourites over getStarred2, useStar, useUnstar)
      components/FavouritesScreen.tsx  # segmented Songs | Albums | Artists
    home/                     # step 9: Home/discover shelves
      shelves.ts              # pure homeShelves(currentYear) shelf config (unit tested)
      hooks/useAlbumShelf.ts  # one getAlbumList2 shelf, keyed by ShelfId
      components/ (HomeScreen — vertical scroll of carousels + Artists/Genres links; AlbumShelf — one horizontal carousel)

  auth/
    useAuthStore.ts            # server URL, salt/token (no password persisted); logout() clears the query cache too;
                               #   step 8b adds sessionExpired()/reauthenticate() for in-place re-auth (ADR 0007)
    ServerConfigScreen.tsx
    ReauthModal.tsx            # step 8b: blocking, password-only re-authentication prompt

  components/                 # shared UI — declarative, no data-fetching/store access (local UI-only
                               # state like open/closed is fine, e.g. Collapsible, AnimatedSplashOverlay)
                               # atoms: CoverArtImage, QueryState (loading/offline-empty/error+retry/pull-to-refresh)
                               # molecules: ArtistRow, AlbumTile, TrackRow, GenreRow, MiniPlayer
                               #   (step 7a overlay), TrackActionsMenu (step 7b shared overflow)...
                               # step 8b: Notice (transient toast) + useNoticeStore (ADR 0007)
  api/
    mutationErrorNotice.ts     # step 8b: pure wording for a failed-mutation Notice (unit tested)
  utils/
    network.ts                # step 8b: expo-network connectivity probe (isOffline), used reactively
                               #   to flavour error messages — not the re-auth gate (ADR 0007)
```

---

## Feature List

### MVP

**Playback**

- Play/pause, next/previous, seek
- Shuffle (with recent-repeat avoidance)
- Repeat modes: off / one / all
- Queue: add to queue, play next, reorder, view queue
- Buffering/stall UI states
- **Gapless playback is explicitly parked out of MVP** — see Deferred/Future Features. It's the most custom, labor-intensive part of the build (manual source-node scheduling, pre-buffering, edge cases across skip/reorder/repeat-one/shuffle) and isn't a dealbreaker for v1; ship basic sequential playback (small gap acceptable) first.
- Persist queue + playback position across app restarts — mechanism (Navidrome's `getPlayQueue`/`savePlayQueue`) decided, exact design deferred to step 8 (see Tech Stack: Local persistence)
- **Lock-screen / notification playback controls (iOS & Android)** — decided set (2026-07-26): `play`/`pause`/`nextTrack`/`previousTrack`/`seekTo` only, matching the MVP feature set exactly; `stop` (doesn't fit a queue player) and `skipForward`/`skipBackward` (fixed-increment skip isn't an MVP feature) are deliberately left out. Artwork + scrubber via `PlaybackNotificationInfo`, and (Android) a persistent media-style notification with a dismiss action; wired through `react-native-audio-api`'s `PlaybackNotificationManager`, kept in sync with player state the same way `AudioEngine` is — see Build Order step 3.

**Offline library browsing** *(pulled into MVP from the original "decide scope later" edge case; mechanism revised 2026-07-26, step 4 grilling session — see `docs/adr/0002-no-local-library-mirror.md`)*

- No local database mirror. TanStack Query's own cache is the local library cache, persisted across app restarts via `@tanstack/react-query-persist-client` (see Tech Stack: Local persistence).
- Top-level lists — `getArtists`, `getGenres`, `getPlaylists`, `getStarred2` — are prefetched right after login, so the top-level library/favourites screens feel instant. Everything below that (an artist's albums, an album's tracks) is fetched lazily on navigation and cached from then on.
- Default cache tuning (easy to revise later): `staleTime` ~5 minutes (quietly refetches in the background when online), persisted-cache `gcTime`/`maxAge` ~7 days (offline browsing of recently-viewed things survives across app restarts for about a week).
- Practical consequence: offline browsing only covers what's actually been viewed before — there's no way to browse the full library from a cold cache with no network. Acceptable for MVP; a real local mirror is the documented fallback if that becomes a hard requirement (see the ADR).
- Explicitly distinct from **offline playback** (downloaded audio files) — that stays a future feature, and never shares storage with the metadata cache above.

**Playlists & Favourites**

- View, create, rename, delete playlists (server-backed)
- Add/remove tracks from playlists
- Star/unstar tracks, albums, artists
- Favourites list view
- Optimistic UI updates with rollback on failure

**Search**

- Search by track, album, artist, genre (via `search3`)
- Debounced input, cached recent searches

**Server & Auth**

- Server URL entry + normalization (scheme, trailing slash, `/rest` handling)
- Subsonic token auth (salt + md5) — salt/token persisted in `expo-secure-store`, password never persisted (see Tech Stack)
- Basic capability probing (not all Navidrome instances support every extension)

**Testing**

- Unit tests for `QueueManager` (shuffle/repeat/queue-mutation logic) and `api/normalize.ts`
  (raw Subsonic response shapes → normalized `Track`/`Artist`/`Album`/`Genre` models) — these
  are pure-logic modules where silent bugs are costly and hard to spot manually.
- No unit-testing effort for UI or native audio integration for MVP — validated by manual
  on-device testing instead (lock-screen controls, actual playback can't be meaningfully
  unit tested anyway).

### Deferred / Future Features

- **Gapless playback** *(newly parked here — was MVP in the original draft)* — add once queue/notification/persistence are proven in production use with basic sequential playback.
- **Offline downloads** (actual audio files playable with no network) — distinct from offline *browsing* above; needs a download manager, storage-quota UI, per-track download state.
- **Album/track discovery** — via Last.fm/MusicBrainz APIs; requires fuzzy matching between local metadata and MBIDs, with caching of resolved matches
- **Scrobbling** — either direct to Last.fm from the app, or via Navidrome's server-side Last.fm/ListenBrainz proxy (simpler, no client-side API keys); queue scrobbles offline and flush on reconnect
- **Smart playlist / Auto DJ** — use Navidrome's built-in `getSimilarSongs2` endpoint (no external API needed)
- **Listening stats** — local playback event logging + aggregation, or leaning on ListenBrainz's stats API if already scrobbling there
- **Social features (activity feed, jam/shared sessions)** — no native Subsonic/Navidrome concept; requires a separate realtime backend (e.g. WebSocket relay) — scope as its own project
- **Built-in equalizer** *(still lowest priority)* — was going to reuse the `MediaElementAudioSourceNode` → `GainNode` graph, but that graph is **silent on Android** and has been removed (playback now uses the standalone `<Audio>` element — see Playback edge cases and `src/player/AudioEngine.tsx`). A future EQ therefore needs a different insertion point, or a native-backed engine (ExoPlayer/Media3), not the "insert `BiquadFilterNode` between source and destination" approach originally assumed.

---

### ⭐ High-priority spike: evaluate expo-audio as the audio backend (2026-08-01)

> **Spike implemented (2026-08-01, branch `spike/expo-audio-lossless`; `docs/adr/0009-expo-audio-lossless.md`).**
> Migration done code-side and green on typecheck + tests: `AudioEngine.tsx` rewritten onto
> `useAudioPlayer` (create-once + `player.replace()`), native lock-screen moved into `AudioEngine`
> (`NotificationBridge` is now a native no-op; web Media Session bridge unchanged), `getStreamUrl`
> reverted to `format=raw` on all platforms, `react-native-audio-api` removed. **Still needs an
> on-device build (`expo prebuild --clean` + run) to confirm** 24-bit FLAC actually decodes and the
> lock screen renders — see ADR 0009 "Open questions".
>
> **Key finding — the trade-off:** expo-audio's lock-screen controls are **play / pause / seek only**;
> both iOS and Android *remove* next/previous-track and handle the rest **natively with no JS event**,
> so the MVP-decided `nextTrack`/`previousTrack` lock-screen buttons (Build Order step 3) are **not
> available** on this backend. It *does* fix the artwork + stale-position polish bugs for free. Whether
> that trade is acceptable — or justifies a small custom media session — is the open call to make on
> device. (Bonus: native lock-screen play/pause now bypasses `PlaybackController`, so `AudioEngine`
> reconciles `desiredPlaying` from observed status; interruption auto-resume is also dropped.)

**Goal:** decide whether to replace `react-native-audio-api` with **expo-audio** (SDK 57's first-party audio module) so we can play **lossless FLAC directly and drop the MP3 transcode** (`docs/adr/0008-transcode-stream-to-mp3.md`). The transcode is lossy and adds per-track server latency ("the app feels slow").

**Why it's on the table now:** `react-native-audio-api` was chosen for its Web Audio node graph as a future-EQ foundation — but that graph is silent on Android and has already been removed (see the Built-in equalizer note above and the Playback edge cases). The main reason to stay no longer holds.

**Verified from the SDK 57 docs** (https://docs.expo.dev/versions/v57.0.0/sdk/audio/):
- Plays **remote HTTP URLs** (streaming) via `useAudioPlayer`.
- Native players: **ExoPlayer/Media3** on Android, **AVPlayer/AVFoundation** on iOS.
- Built-in **background audio + lock-screen / Now Playing controls**: `setActiveForLockScreen(active, metadata, options)` accepts title / artist / **album art** — may also resolve the "native media controls" polish item below.
- Imperative player API (`player.replace()/play()/pause()/seekTo()`), which fits the reactive store architecture (ADR 0001: `PlaybackController` writes proposed state, `AudioEngine` drives the player and reports observed state) and would remove the `key`-per-track remount workaround currently in `AudioEngine`.
- `AudioQuality` is a **recording** option, not a playback fidelity knob (playback fidelity = the source file).

**NOT yet verified — the point of the spike (test on a real device):**
- That ExoPlayer/Media3 actually decodes our **24-bit FLAC** on the target Android hardware (Media3 generally supports it, but the expo docs don't list FLAC explicitly and device decoders vary); likewise AVFoundation on iOS.
- Lock-screen controls render artwork and a **correct per-track position**.
- Interruption / audio-focus behaviour (ADR 0007 halt-on-error, auto-pause on focus loss) can be reproduced on the new backend.
- (Gapless remains out of scope — still parked.)

**Migration shape if the spike passes** (contained — two files):
- Rewrite `src/player/AudioEngine.tsx` onto `useAudioPlayer` (imperative `replace` on track change, `play`/`pause`, `seekTo`; subscribe to player status for observed position/status/ended).
- Rewrite/replace `NotificationBridge` onto expo-audio's lock-screen API.
- Revert `getStreamUrl` to stream **raw** (keep `format=mp3` only as an optional data-saver fallback), superseding `docs/adr/0008`.
- Add `expo-audio`, remove `react-native-audio-api`, then `expo prebuild --clean` + rebuild.

**Trade-off:** loses the Web Audio EQ graph (already lost on Android anyway); a future EQ would then need a native-backed approach.

---

### Known issues / polish backlog (from on-device testing, 2026-08-01)

Surfaced once native playback started working (see `docs/adr/0008-transcode-stream-to-mp3.md`):

- **Native media controls (lock screen / notification), Android + iOS** — `NotificationBridge` shows **no artwork** (cover art isn't loaded into the control), and on **Next** the reported position is **stale** (the control shows the *previous* track's seek value instead of resetting for the new track). Fix artwork loading and position/metadata sync on track change.
- **Login screen keyboard overlap** — the on-screen keyboard covers the input fields. Wrap the form in `KeyboardAvoidingView` (and/or make it scrollable) so the focused field stays visible.
- **Android hardware Back on the full player** — pressing the device Back button while the full Now Playing screen is open should **collapse it to the MiniPlayer**, not pop the navigation stack / leave the screen. Intercept the back action on the Now Playing route to dismiss it.

---

## Key Edge Cases

**Auth & connection**

- Salt/token persisted; password never stored (see Tech Stack) — re-prompt only on explicit re-login
- Self-signed certs, http vs https, malformed URLs
- Partial Subsonic API support across Navidrome versions — probe, don't assume
- Web: salt/token persisted in `localStorage` rather than an encrypted store — accepted, documented trade-off (see Tech Stack: Secrets)

**Playback**

- **Validated** (2026-07-26, build order step 0): the `<Audio>` tag component routed through `MediaElementAudioSourceNode` — not `StreamerNode`, which is HLS-oriented and still experimental for general use — is the correct primitive for a plain progressive-HTTP MP3 URL. FFmpeg (needed for proper HTTP byte-range streaming rather than a full-file download before playback starts) ships bundled and enabled by default. Confirmed working on a real device build (RN 0.86 / Expo 57, New Architecture default): play/pause/seek all functioned against a hardcoded remote MP3 in `src/app/index.tsx`. `<Audio>` also routes cleanly through `GainNode` before the destination, validating the graph-based approach the future EQ depends on.
- **Superseded (2026-08-01), full end-to-end playback debugging on device**: three corrections to the above, all in `src/player/AudioEngine.tsx`. (1) The `MediaElementAudioSourceNode` → `GainNode` graph is **silent on Android** in `react-native-audio-api` 0.13 — the element loads and reports playing but no audio reaches the output; playback now uses the **standalone** `<Audio>` element (no AudioContext graph), which is also the library's documented default. (2) The library's *source-swap* teardown disposes but never **pauses** the old source (its unmount teardown does), so switching tracks left the previous song audibly playing; fixed with a `key`-per-track remount. (3) 24-bit FLAC decodes but outputs **silence** on Android, so `getStreamUrl` transcodes to MP3 on native (web streams raw — the browser decodes FLAC) — see `docs/adr/0008-transcode-stream-to-mp3.md`.
- Transcoding/bitrate settings and server-driven format changes
- **Audio focus interruptions — decided (2026-07-26, step 3 grilling session)**: `AudioEngine` subscribes to `react-native-audio-api`'s `AudioManager` `interruption` event (calls, other apps taking focus) and auto-pauses on interruption start, resuming only if the OS signals `shouldResume`. Built in step 3. Bluetooth/other device route changes (`routeChange` event) are a separate, still-undecided event — not handled by this decision, left for a later pass.
- Notification/lock-screen control state staying in sync with actual playback state across OS-level kills — `NotificationBridge` and `AudioEngine` both follow the same reactive pattern (see Build Order step 3 and `docs/adr/0001-player-state-flows-through-store.md`): neither owns state independently, both subscribe to `usePlayerStore` and stay correct by construction rather than manual syncing

**Library**

- Pagination for large libraries (10k+ tracks) — relevant to `getAlbumList2` (max 500/page) and any listing screen, not to a sync crawl (see below)
- IDs aren't always stable across rescans — prefer MusicBrainz IDs for long-lived references (favourites, stats). Not yet verified that Navidrome actually exposes `musicBrainzId` fields on artist/album/song responses — confirm against a real instance before relying on this.
- **No incremental-fetch support in the Subsonic API — confirmed 2026-07-26, step 4 grilling session**: `getArtists`/`getAlbumList2` have no changed-since parameter; only the older, file-structure-based `getIndexes` supports `ifModifiedSince`, and it doesn't map onto ID3 artist/album/track IDs. Rather than build a full-catalog crawl-and-diff to work around this, the plan now avoids a local mirror entirely — see Tech Stack: Local persistence and `docs/adr/0002-no-local-library-mirror.md`.

**Queue**

- Recently-played ring buffer for shuffle
- "Play next" vs "add to queue" distinction
- Persisting reorder/repeat/shuffle state
- Queue vs. Playlist vs. Library are three distinct concepts, easy to conflate — see `CONTEXT.md` for the canonical definitions. `QueueManager` (step 3) is pure local queue-ordering logic and has no knowledge of the network; it operates on already-resolved `Track`s regardless of where they came from (a mocked list in step 3, the TanStack-Query-cached Library from step 4/5 onward)

**Search**

- `search3` returns artists/albums/songs in one call — design UI around combined results, not three separate requests

---

## Build Order

1. **Streaming spike** (moved ahead of everything else) — bare dev client, hardcoded progressive-HTTP URL, confirm `react-native-audio-api` plays it correctly and works on New Architecture. No Subsonic client code yet — if this fails, the whole audio-library choice needs revisiting before anything else is built on top of it.
2. Dev client setup (local prebuild) + Subsonic auth/client skeleton (salt+token only)
3. `react-native-audio-api` integration: `AudioEngine`, `QueueManager` (+ unit tests), `PlaybackController`, `NotificationBridge` (lock-screen/notification controls). Architecture decided via grilling session, 2026-07-26 (full rationale: `docs/adr/0001-player-state-flows-through-store.md`, terms: `CONTEXT.md`):

   - **`usePlayerStore` (Zustand) is the single source of truth.** `react-native-audio-api`'s `<Audio>` component has no imperative "load new track" method — only a reactive `source` prop — so `AudioEngine` can't be a headless class; it's React-backed (a hook + one persistently-mounted host, likely in `_layout.tsx`). Given that, the app is **reactive/store-driven**, not imperative: `PlaybackController` only ever writes *proposed* state into the store; `AudioEngine` is the only thing that touches the `<Audio>` ref/`AudioContext` graph, and the only thing that writes *observed* facts (position, playback status, interruption-driven pauses) back into the store.
   - **`QueueManager` is pure functions, no internal state.** Given `queue state, operation` → returns new `queue state`. No store access, no network awareness — called only by `PlaybackController`. See the Queue edge case above for why this boundary matters.
   - **`NotificationBridge`** follows the same reactive pattern as `AudioEngine` (subscribes to the store to render the OS notification) but forwards button presses into `PlaybackController` calls — the same entry point the UI itself uses. Controls: see Feature List → Playback.
   - **Scope decided this session**: audio-focus interruption handling built now (see Key Edge Cases → Playback); queue/position persistence deferred to step 8 (see Tech Stack → Local persistence); a minimal `getStreamUrl()` added to `api/subsonic/endpoints/media.ts` now — just the URL builder, ahead of the rest of that file — so the engine can be exercised against real Navidrome tracks via hand-written mock `Track` objects, without waiting for library browsing (step 5).

     ```
     Library browsing UI (future step)
           │ reads
           ▼
     SQLite mirror  ◀── synced by ──  TanStack Query  ◀── calls ──  api/subsonic/endpoints/*
           │
           │ user taps "play this album" → hands PlaybackController a list of already-resolved Tracks
           ▼
     PlaybackController ──calls (pure math)──▶ QueueManager
           │ writes proposed state
           ▼
     usePlayerStore ◀──writes back observed facts── AudioEngine ──plays via── stream URL
           ▲                                              (getStreamUrl(), from api/subsonic/endpoints/media.ts)
           │ subscribes + renders
     NotificationBridge / UI components
     ```

     Example trace — user taps "skip forward": UI calls `PlaybackController.skipNext()` → it calls `QueueManager.getNextTrack(currentQueueState, repeatMode)` (pure) → writes the result into `usePlayerStore` → `AudioEngine`'s subscription fires, swaps the `<Audio source>`, calls `.play()` → `<Audio>`'s `onPlay`/`onPositionChange` events write back into the store → UI and `NotificationBridge` re-render from the store.
4. Local data layer: `QueryClient` + persister setup, browsing endpoints, and response normalization (+ unit tests). Architecture decided via grilling session, 2026-07-26 (full rationale: `docs/adr/0002-no-local-library-mirror.md`):

   - **No local database mirror.** The original plan called for a full SQLite schema (artists/albums/tracks/genres/playlists) as source of truth, synced incrementally from the Subsonic API. Dropped after two findings: the API has no incremental-fetch primitive for ID3 data (see Key Edge Cases → Library), and a real Subsonic client (tempus, a fork of Tempo) doesn't mirror the catalog locally at all — its local database only holds things that need genuine local durability (downloads, favourites, playlists, queue, recent searches), and artist/album/song browsing hits the network live per screen. Spotify's public offline behavior follows the same shape: opportunistic browsing cache, wholly separate explicit-download mechanism for audio.
   - **TanStack Query's cache is the local library cache**, persisted via `@tanstack/react-query-persist-client` + `createAsyncStoragePersister`, backed by a platform-branched key-value adapter in `api/queryClient.ts` — `expo-sqlite/kv-store` on native, `localStorage` on web (mirrors the native/web split already used for secrets — see Tech Stack).
   - **Prefetch on login**: `getArtists`, `getGenres`, `getPlaylists`, `getStarred2` — cheap, single calls each, so top-level screens feel instant. Everything else (an artist's albums, an album's tracks) is fetched lazily on navigation.
   - **`api/normalize.ts` is the new unit-tested seam**, replacing the old `db/sync.ts` diff/merge logic: pure functions mapping raw Subsonic shapes (`ArtistID3`, `AlbumID3`, `Child`) to the app's normalized `Track`/`Artist`/`Album`/`Genre` types in `api/types.ts`.
   - **`api/subsonic/endpoints/browsing.ts`** gets `getArtists`/`getArtist`/`getAlbum`/`getGenres`/`getPlaylists` now; the hooks/UI that consume them (`features/library/hooks/*`) are step 5, same split as originally planned.
5. Library browsing (artists/albums/genres) with pagination, backed by the persisted TanStack Query cache. Architecture decided via grilling session, 2026-07-27:

   - **Tabs**: drop the scaffold `explore` tab; add `library` (wired to this step) and `settings` (a logout button, calling the existing `useAuthStore.logout()` — see below). `index` (home/discover) is left as the build-order-step-4 smoke-test screen for now; its real "home/discover" content isn't part of this step.
   - **Logout also clears the query cache**: `useAuthStore.logout()` now calls `queryClient.clear()` in addition to clearing persisted credentials. Cache keys aren't scoped by server/user (`queryKeys.ts` is just `['artists']`, etc.), so without this a second account/server would see the first account's cached library until every query happened to refetch.
   - **Artists list gets A-Z section headers, preserving the server's own grouping.** `getArtists` already returns artists grouped into alphabetical sections (`SubsonicIndex[]`), with server-side rules (e.g. `ignoredArticles`) already applied. `normalize.ts`'s `flattenArtistIndex` discards this; a new function preserves it (`{ letter, artists }[]`) for the Artists screen instead of re-deriving groups client-side.
   - **Genre → albums is the one real pagination surface.** Tapping a genre drills into a paginated album grid via a new `getAlbumList2` call (`type=byGenre`), fetched via `useInfiniteQuery`, 500/page (Subsonic's max). Every other list in this step (artists, genres, playlists, an artist's albums, an album's tracks) comes back in one unpaginated call.
   - **Cover art** (full rationale: `docs/adr/0003-cover-art-sizing-and-caching.md`): new `getCoverArtUrl(serverUrl, coverArtId, auth, size)` builder alongside `getStreamUrl` in `api/subsonic/endpoints/media.ts`. Rendered via `expo-image` (disk+memory cached out of the box) rather than the query cache — cover art never becomes react-query state, it's a signed URL passed straight to `<Image>`. Two fixed sizes for now: `150` for list rows, `600` for detail headers — a third, larger size for tablet/web is deliberately deferred, not overlooked (no tablet/web layout exists yet to size it for). `utils/cache.ts` stays unbuilt/deferred — `expo-image`'s cache covers the documented need.
   - **Playback wiring**: album detail's "Play" button calls `PlaybackController.play(tracks, 0)`; tapping a track row calls `play(tracks, tappedIndex)`; a per-row overflow menu exposes "Play next"/"Add to queue" via the already-built `playNext`/`addToQueue`. Artist detail is a pure drill-down to albums — no "play all songs by artist" (not in the Feature List, and `getArtist` doesn't return a flat song list anyway).
   - **Hooks read credentials internally.** `useArtists`, `useArtist(id)`, `useAlbum(id)`, `useGenres`, `useAlbumsByGenre(genre)` (in `features/library/hooks/`) each read `credentials` from `useAuthStore` directly rather than taking `serverUrl`/`auth` as params — safe since these screens only render behind the `status === 'authenticated'` gate in `_layout.tsx`. Avoids threading credentials as props through nested routes.
   - **Shared loading/error/empty handling.** One component (`components/QueryState.tsx`) wraps a query result: spinner while loading, a distinct "you're offline and haven't viewed this yet" message for a cold cache with no network (a new case — see `docs/adr/0002-no-local-library-mirror.md`'s offline-browsing limits), error + retry, or children once data's there. Includes pull-to-refresh (`refetch()`), the only way to bypass the 5-minute `staleTime` early.
   - **No NativeWind/Tailwind.** Considered for the new screens' styling, rejected: it's a project-wide tooling/migration decision with real cost (either rewrite the existing `Colors`/`Spacing`/`ThemedText`/`ThemedView` system in NativeWind, or run two styling systems side by side), for a problem (layout boilerplate) that plain `StyleSheet` already handles. Staying on `StyleSheet` + the existing themed components.
   - **Components built atomic-design style, shared vs. feature-orchestration split.** `components/` (shared, declarative — no data-fetching or store access, though local UI-only state like an open/closed toggle is fine, same as the existing `Collapsible`/`AnimatedSplashOverlay`) gets the atoms/molecules: `CoverArtImage`, `QueryState`, `ArtistRow`, `AlbumTile`, `TrackRow`, `GenreRow`. `features/library/components/` gets the orchestration layer — the screen-level components that call the hooks above and wire taps to `PlaybackController`. `player/` stays a top-level sibling of `features/`, not nested under it — it's cross-cutting infrastructure every feature calls into, not a screen-oriented slice itself.
6. Search (`search3`) + recent searches. Architecture decided via grilling session, 2026-07-28:

   - **Text search only — no attribute filters.** `search3` takes only `query` + per-entity `count`/`offset` + `musicFolderId`; it has *no* genre/year/type filter. Genre/year filtering lives on a *different* endpoint (`getAlbumList2 byGenre/byYear`, albums only; `getSongsByGenre`) that takes no text query — so "search + filters" can't be combined server-side, and attribute filters are deliberately out of this step. Client-side grouping/discovery shelves (Recently Added, New Releases, Explore) are split into their own step — see step 9.
   - **Combined result → single sectioned scroll.** `search3` returns artists + albums + songs in one call (the plan's "design UI around combined results, not three separate requests" note). Rendered as one vertical scroll with labeled sections in **Artists → Songs → Albums** order, reusing the step-5 molecules (`ArtistRow`/`AlbumTile`/`TrackRow`) — *not* a per-entity segmented view (that segmented "result-type filter" is deferred; adding it later is the clean follow-up if the combined scroll feels cramped). Fixed request counts **20 artists / 20 albums / 40 songs**, all rendered, no pagination / no "See all" for MVP (pagination is a Library concern per Key Edge Cases, not a search one). `TrackRow` shows a cover-art thumbnail here (no album track number to show, unlike album detail).
   - **Client-side result refinements** (post-filters over the raw `search3` response, applied in `useSearch`'s `select` so both the rendered lists and the empty-state check see the filtered data; pure + unit-tested):
     - **Songs are matched by *title* only** (`filterSongsByTitle`). `search3` matches a query against a song's title *and* artist *and* album with no server-side way to scope it, so searching an artist's name would otherwise dump that artist's whole catalogue under Songs. The filter keeps songs whose title contains every query token (case-insensitive, order-independent). Consequence: a title search can show fewer than the 40 fetched songs even when more exist server-side — acceptable for MVP; a "See all songs" follow-up is the fix if it feels thin.
     - **Content-less artists are dropped** (`filterArtistsWithContent`). `search3` can return name-only artist matches with nothing to browse into (dead ends when tapped); keep only artists with `albumCount > 0` (in Navidrome every song lives under an album, so zero albums means no content). Relies on the server populating `albumCount` on search results — the same field the Library artist rows already use.
   - **Debounced input, recent searches.** 300 ms debounce, fires at **≥ 2 chars**; an empty/sub-threshold box shows **Recent Searches** instead of results. Recent searches are query *strings* persisted in `kvStorage` (JSON array, most-recent-first, case-insensitive dedup, cap 10), **saved on result tap** (not per debounced keystroke — avoids saving prefix fragments); tap-to-rerun, ✕-to-remove, Clear-all. They live in the KV store (the plan's designated home for recent searches), not the query cache.
   - **Search results are in-memory only** — excluded from the persisted query cache via `persistOptions.dehydrateOptions.shouldDehydrateQuery` (skip queries whose root key is `'search'`). Search is a live "ask the server now" action; persisting it would bloat the KV cache with transient queries and surface confusing *stale* offline results. Recent-search *strings* persist regardless; library-browsing persistence is unchanged.
   - **Own nested stack, reusing the step-5 detail screens.** `src/app/search/{index,artist/[id],album/[id]}.tsx` are thin route files rendering the shared `ArtistDetailScreen`/`AlbumDetailScreen`, so drilling (Artist → its albums → Album) stays *inside* the Search tab (native tabs each keep their own stack). Those two components gain a **`basePath` prop** (`/library` vs `/search`) so their internal album-push respects the current tab instead of hardcoding `/library`; the genre link from an album may still deep-link to `/library/genre/…` (genre is a Library concept, absent from `search3` results — that single cross-tab jump is fine). A new `search` tab is added to `app-tabs.tsx` + `app-tabs.web.tsx`. Songs have no detail screen (tap = play).
   - **Song tap plays now without destroying the queue** (full rationale: `docs/adr/0004-search-tap-preserves-queue.md`): if a queue already exists, a new `PlaybackController.playNow(track)` inserts the song at the current position and plays it immediately (the current track becomes next — nothing lost); if no queue exists, it fetches `getAlbum(song.albumId)` and plays that album from the tapped song, falling back to the single song if the fetch fails. "Play related songs" (`getSimilarSongs2`) is future (parked as Auto DJ, step 10). Album/artist taps go to their detail screens (queue untouched). The per-row overflow menu (Play next / Add to queue, via the existing `playNext`/`addToQueue`) carries over from `AlbumDetailScreen`. **Deliberate divergence**: album-detail's track tap stays queue-*replacing* (a deliberate "make this album my queue"); search's exploratory context preserves it instead — see the ADR.
   - **New/changed code**: `api/subsonic/endpoints/search.ts` (`search3`) + `GetSearch3Response`/`searchResult3` types, `queryKeys.search(query)`, reusing the existing `normalize.ts` normalizers (`Track` gains `albumId`, for the no-queue `playNow` album lookup); `features/search/hooks/` (`useSearch` debounced, `useRecentSearches`) + `features/search/components/SearchScreen.tsx`; pure `features/search/{filterSongsByTitle,filterArtistsWithContent,recentSearches}.ts` (unit-tested); `PlaybackController.playNow` (+ pure `QueueManager.playNow`); `basePath` threaded into `ArtistDetailScreen`.
7. Playlists + favourites (CRUD + optimistic UI) + Queue view. Sliced into two sub-steps and
   designed via grilling session, 2026-07-28. **7a (player transport shell) is built first** — it's
   the missing UI half of the already-built playback engine, and the Queue view has no entry point
   without it; **7b (playlists + favourites)** follows.

   **7a — Player transport shell.** Three surfaces: a persistent **MiniPlayer** → expands to a
   full-screen **now-playing** modal → **Queue** opened from within now-playing.

   - **MiniPlayer is a hand-rolled JS overlay on all platforms** (full rationale:
     `docs/adr/0005-miniplayer-js-overlay-not-native-accessory.md`). Mounted as a sibling of
     `NativeTabs` in `_layout.tsx`, positioned above the tab bar via safe-area insets + tab-bar
     height, driven by `usePlayerStore`. Expo v57's `NativeTabs.BottomAccessory` would be the native
     way to dock it, but it's **iOS-only** — deferred in favour of one cross-platform implementation
     (iOS+Android are co-equal MVP targets). Swapping in the native accessory on iOS later is a
     contained change. MiniPlayer contents: artwork + title/artist + play-pause + a hairline progress
     line, tap anywhere to expand.
   - **now-playing** (full-screen JS overlay, slide-up + swipe-down-to-dismiss; MiniPlayer hidden
     while open): big artwork,
     title/artist/album, scrubber + seek (`position`/`status` from the store, `duration` from the
     track), play-pause, prev/next, shuffle, repeat toggles, and an open-queue button. Buffering
     shows via the existing `status: 'loading'`. The favourite (star) toggle and add-to-playlist
     action are **deferred to 7b** (their endpoints don't exist until then).
   - **Queue view:** renders the full `QueueState.tracks` — already-played dimmed above, current
     highlighted, upcoming below — with **tap-to-jump**, drag-reorder (`reorder`), and swipe-remove
     (`removeAt`). Tap-to-jump needs a new pure `QueueManager.jumpTo(index)` + `PlaybackController.jumpTo`
     (today `play()` only *replaces* the queue; there's no jump-within-existing-queue). `jumpTo` gets
     a unit test alongside the other `QueueManager` functions.
   - **New/changed code (7a):** `QueueManager.jumpTo` (+ test) and `PlaybackController.jumpTo`;
     `components/MiniPlayer.tsx` (the overlay, exports the shared `PlayPauseButton`) mounted in
     `_layout.tsx`; `player/usePlayerUiStore.ts` (overlay open/close state); `player/hooks/useProgress.ts`
     (+ `formatTime`) for the scrubber; `features/player/components/` — `NowPlayingScreen`, `QueueScreen`,
     and `Scrubber` — all JS overlays mounted in `_layout.tsx` rather than `player/now-playing.tsx` /
     `player/queue.tsx` router routes (NativeTabs-at-root can't host modal routes without a root Stack;
     decided during 7a — see ADR 0005). Gestures (swipe-dismiss, drag-reorder, swipe-remove, scrubber)
     are hand-rolled on `Animated` + `PanResponder`, no reanimated dependency.

   **7b — Playlists + Favourites.** Server-backed CRUD with optimistic UI, plus the starred-items
   collection. Terminology stays API-faithful: **Library = catalog**, **Playlists**, and
   **Favourites (= starred)** are three distinct concepts (see `CONTEXT.md`); the API reserves
   "library" for the media catalog, so we never call the personal collection "Library".

   - **Tab bar becomes `Home | Search | My Music | Settings`.** The catalog-browse **`library` tab
     is dropped as a tab** (its `artist`/`album`/`genre` routes stay); Home links straight to Artists
     and Albums — "called what they are" — and step 9 turns those into horizontal carousels + a "See
     all" into the full lists. `My Music` (see `CONTEXT.md`) is the new tab grouping the two personal
     collections; it is deliberately *not* named "Library". Dropping the catalog tab freed the slot
     that lets Playlists and Favourites share one tab without crowding.
   - **My Music** = the user's **Playlists** as a vertical list, with a pinned **Favourites**
     shortcut row at the top (Spotify's "Liked Songs" shape) that drills into a **Favourites screen**.
     Favourites are three collections (`getStarred2` → starred songs/albums/artists), shown behind a
     **segmented control: Songs | Albums | Artists**, each with its own row/tile layout (contrast
     search's combined scroll — favourites can grow large).
   - **Playlist ops:** create, rename, delete, add-track, remove-track (via the positional
     `songIndexToRemove` — a sharp edge for optimistic updates), and a public/private toggle
     (`updatePlaylist`'s `public`). **Track reorder is deferred** — the Subsonic API has no reorder
     primitive; it'd mean re-sending the whole ordered `songId` list via `createPlaylist(playlistId, …)`
     (full replace), achievable later. Playlist detail is modeled on `AlbumDetailScreen`: cover +
     name + count/duration header, a Play button (`play(tracks, 0)`), a TrackRow list, per-row overflow.
   - **Favourite / actions UX:** row-level actions live in the shared **overflow menu** —
     star/unstar, add-to-playlist, play-next, add-to-queue, and remove-from-playlist (on playlist
     detail). AlbumDetail's local `Modal`+`MenuOption` menu is extracted into a shared
     `TrackActionsMenu` reused across album/playlist/search/queue/now-playing. A **standalone heart**
     appears only on album/artist/playlist **detail headers** and **now-playing** (one-tap favouriting
     where intent is highest); dense list rows stay clean and favourite via the menu. Rendering heart
     state requires a new **`starred` field** on normalized `Track`/`Album`/`Artist` (from the API's
     `starred`/`starredAt`), added in `types.ts` + `normalize.ts`.
   - **Add-to-playlist:** single-track only, opening a sheet of existing playlists + an inline "New
     playlist"; a "+" in the My Music/Playlists header also creates. Album/artist bulk add-to-playlist
     and "save queue as playlist" are **deferred** (kept 7b focused; both are clean follow-ups).
   - **Optimistic UI:** star/unstar, rename, delete, add-track, remove-track are optimistic with
     rollback (cancel in-flight → snapshot → patch cache → roll back `onError` → invalidate
     `onSettled`). **Create playlist is await-then-invalidate**, not optimistic — an optimistic insert
     needs a temp client id reconciled to the server's real id, fragile and not worth it for a rare
     action.
   - **New/changed code (7b):** `api/subsonic/endpoints/playlists.ts` (`getPlaylists`/`getPlaylist`/
     `createPlaylist`/`updatePlaylist`/`deletePlaylist`) + `annotations.ts` (`star`/`unstar`) +
     `getStarred2`; `starred` added to `Track`/`Album`/`Artist` in `api/types.ts` + `normalize.ts`;
     `queryKeys.playlist(id)` and the existing `starred()` key put to use; `features/playlists/`
     (hooks: `usePlaylists`/`usePlaylist`/`useCreatePlaylist`/`useUpdatePlaylist`/`useDeletePlaylist`/
     `useAddToPlaylist`; screens: My Music landing + playlist detail) and `features/favourites/`
     (`useFavourites` over `getStarred2`, `useStar`/`useUnstar`; Favourites screen); the shared
     `components/TrackActionsMenu.tsx`; `playlist/[id].tsx` route; `app-tabs.tsx` + `app-tabs.web.tsx`
     updated to `Home | Search | My Music | Settings`.
8. Polish: persistence, offline queue recovery, error states. Split into **8a** (persistence) and
   **8b** (error states), mirroring step 7's split.
   - **8a — queue persistence (done, 2026-07-30, `docs/adr/0006-local-only-queue-persistence.md`):**
     local-only durable Queue restored **paused, from position 0** on launch (no
     `savePlayQueue`/`getPlayQueue`, no cross-device, no intra-track resume). `usePlayerStore`
     wrapped in zustand `persist` (`partialize` → queue only, `version: 1`, reset-to-empty on
     corrupt/version-mismatch); observed `status`+`position` split into a new
     `usePlaybackStatusStore` so the ~1/sec position tick never triggers a write. `shuffle`/`repeat`/
     `originalOrder` ride inside the persisted queue (the server can't store them — *why* local
     persistence was mandatory). `currentIndex` clamped to 0 on restore; `logout()` clears the
     persisted queue.
   - **8b — error states (done, 2026-07-30, `docs/adr/0007-error-states.md`):** one slice, sequenced internally —
     two foundations, then three consumers. **Foundations:** a hand-rolled **`Notice`** primitive
     (transient, auto-dismissing, non-blocking; one store mounted at root, MiniPlayer layering;
     reserved for surface-less actions) and a **`utils/network.ts`** connectivity probe over
     `expo-network` (used *reactively* to flavour messages — **not** for the re-login gate, which
     keys off error class; this corrects ADR 0006's stated rationale). **Consumers:** (1) **playback
     failure halts** on the current track with a new `'error'` `PlaybackStatus`, surfaced inline in
     MiniPlayer/now-playing, play button as Retry — *no* auto-advance (offline would runaway-skip
     the whole queue); (2) **mid-session token rejection** (code 40/41, caught in a global
     `QueryCache`/`MutationCache` `onError`) triggers in-place **Re-authentication** — one idempotent
     `sessionExpired()` flag → a blocking password-only modal that recomputes the token and preserves
     Queue + cache + nav, with an inline error on re-reject and a "Sign out" escape to full
     `logout()`; queries refetch, failed mutations are *not* replayed; (3) **failed mutations** fire
     a `Notice` centrally from `MutationCache.onError` via per-mutation `meta: { action }`, worded by
     error class, no Retry, suppressed on auth errors. **Out of scope:** proactive offline banner,
     playback auto-skip, intra-track resume, cross-device sync, mutation auto-replay.
9. Home / discover shelves (done, 2026-07-30; split out of step 6 during the 2026-07-28 grilling
   session) — the real content for the Home tab, replacing step 7b's redirect-into-the-Artists-list
   placeholder. No ADR; design finalised during implementation and captured here. Client-side
   grouping of `getAlbumList2` shelves, rendered as horizontal carousels down a vertical scroll:

   - **Three shelves** (`features/home/shelves.ts`, a pure `homeShelves(currentYear)` config, unit
     tested): **Recently Added** (`type=newest`, by date added to the server's scan/import), **New
     Releases** (`type=byYear` with a `fromYear > toYear` window — the current year back 5 years,
     newest-first; the closest `getAlbumList2` ordering to the album's own release date, distinct
     from date-added — year granularity is enough for MVP; OpenSubsonic `originalReleaseDate` is a
     later refinement), and **Explore** (`type=random`; `recent`/`frequent` are the same mechanism
     and the obvious follow-up shelves). These are faceted *browse*, no text query — deliberately
     kept separate from Search. If genre/year *attribute* filtering is ever wanted, it belongs here
     (`getAlbumList2 byGenre/byYear`), not bolted onto the search box.
   - **Routing restructure.** The Home tab (internal route name still `library`) now renders the new
     `HomeScreen` at `/library`; the full sectioned **Artists/Genres catalog list** moved one level
     down to a pushed `/library/artists` route (`ArtistsScreen`, retitled "Library", gains an
     `initialView` prop so Home's **Genres** quick link opens straight on the Genres toggle via
     `?view=genres`). Home shows two quick links (Artists / Genres) above the shelves — the "See all
     into the full lists" the step 7b note anticipated. The album/artist/genre **detail routes are
     unchanged** (still under `/library/...`).
   - **Data.** New generic `getAlbumList2(serverUrl, auth, params)` in `endpoints/browsing.ts`
     (single unpaginated page; the existing paginated `getAlbumsByGenre` stays the `byGenre`
     variant), a `useAlbumShelf(shelf)` hook keyed by `queryKeys.albumShelf(id)`, and the three
     shelves added to `prefetchLibrary` so Home is instant after login. Shelves **persist** in the
     query cache like other library data (offline Home shows cached shelves; the `random` set may
     look stale — acceptable). A shelf that errors or comes back empty **renders nothing**, so Home
     degrades to just the shelves with content rather than showing per-shelf error blocks.
   - **New/changed code**: `features/home/` (`shelves.ts` + test, `hooks/useAlbumShelf.ts`,
     `components/HomeScreen.tsx` + `AlbumShelf.tsx`); `getAlbumList2` + `AlbumListType`/`AlbumListParams`
     in `browsing.ts`; `queryKeys.albumShelf`; `app/library/index.tsx` now renders `HomeScreen`,
     new `app/library/artists.tsx` route + `_layout.tsx` registration; `ArtistsScreen` `initialView`
     prop + retitle; `prefetchLibrary` prefetches the shelves.
10. Future features, in order: Auto DJ (cheapest, uses existing Navidrome endpoint) → scrobbling → discovery → listening stats → social/jam → gapless playback → EQ (lowest priority)

---

## Summary of Changes from Original Draft

| Area | Original draft | Revised |
| --- | --- | --- |
| File structure | Root-level `app/` | Everything under `src/`, matching existing scaffold |
| Streaming spike timing | Step 2 | Step 0 — before any other code, given it's the highest-risk bet |
| Local persistence | "expo-sqlite (or WatermelonDB)" — undecided, cache-only framing | No local database at all — TanStack Query's persisted cache is the local library cache (`expo-sqlite/kv-store`/`localStorage`), decided after a full-mirror plan was tried and reversed in the step 4 grilling session (2026-07-26) — see Build Order step 4 and `docs/adr/0002-no-local-library-mirror.md` |
| Password storage | Plaintext password in secure storage, for token regen | Salt + token only; password never persisted |
| Gapless playback | MVP feature | Parked to future features, after core playback is proven |
| Web platform | Implied via `react-native-web` in scaffold | Explicitly out of scope for MVP; mobile-only |
| Testing | Not mentioned | Unit tests for `QueueManager` and `db/sync.ts` specifically |
| Tab/route structure | Draft assumed a `(tabs)` route group (`app/(tabs)/index.tsx`, etc.) with 5 tabs (home, library, search, playlists, settings) | Actual `app-tabs.tsx` mounts `NativeTabs` directly in `_layout.tsx` over flat top-level route files, no `(tabs)` group — caught during the step 5 grilling session (2026-07-27). Tabs are added incrementally as real content lands: `explore` dropped, `library` and `settings` added in step 5; `search` added in step 6. **Step 7 (2026-07-28)** restructures to `Home \| Search \| My Music \| Settings`: the `library` catalog *tab* is dropped (Home links to Artists/Albums, and step 9's carousels absorb it; routes stay), and **My Music** — one new tab grouping Playlists + Favourites — replaces the originally-planned standalone `playlists` tab. My Music is deliberately not "Library", which the API and glossary reserve for the catalog (Subsonic's "media library") |
| Player transport UI | Not explicitly scoped in the original draft (playback *engine* only) | Step 7a builds the missing player shell — a persistent MiniPlayer + now-playing modal + Queue view — before the playlists/favourites CRUD. The MiniPlayer is a hand-rolled JS overlay on all platforms rather than iOS-only `NativeTabs.BottomAccessory` (`docs/adr/0005-miniplayer-js-overlay-not-native-accessory.md`). Decided step 7 grilling session (2026-07-28) |
| Search scope | "Search by track, album, artist, genre" implied filters | Text `search3` only — the API has no genre/year/type filter on search, so attribute filters are out; the "Recently Added / New Releases / Explore" grouping the user asked for is faceted `getAlbumList2` *browse*, split into its own home/discover step (Build Order step 9), not part of search. Decided step 6 grilling session (2026-07-28) |
