# Subsonic/Navidrome Music Player — Project Plan

React Native (Expo) music player client for Subsonic/Navidrome servers.

This plan was stress-tested via a grilling session on 2026-07-26. Every deviation from
the original draft is called out explicitly below, with the reasoning behind it.

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
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
  app/                          # expo-router screens
    (tabs)/
      index.tsx                 # home/discover
      library.tsx
      search.tsx
      playlists.tsx
      settings.tsx
    player/
      now-playing.tsx           # full-screen player (modal)
      queue.tsx
    album/[id].tsx
    artist/[id].tsx
    playlist/[id].tsx
    _layout.tsx

  api/
    subsonic/
      client.ts               # low-level fetch wrapper, auth/signing
      endpoints/
        browsing.ts           # getArtists, getArtist, getAlbum, getGenres, getPlaylists
        search.ts
        playlists.ts
        media.ts               # stream/download URL builders
        annotations.ts        # star, scrobble, rating
      types.ts
      errors.ts
    types.ts                    # normalized app-level models (Track, Artist, Album, Genre...)
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
    library/
      hooks/ (useArtists, useAlbums, useGenres...)
      components/
    search/
      hooks/useSearch.ts       # debounced, multi-entity
      components/
    playlists/
      hooks/ (usePlaylists, useCreatePlaylist, useAddToPlaylist)
    favourites/
      hooks/useFavourites.ts

  auth/
    useAuthStore.ts            # server URL, salt/token (no password persisted)
    ServerConfigScreen.tsx

  components/                 # shared UI (TrackRow, AlbumGrid, MiniPlayer...)
  utils/
    cache.ts                  # image cache management (file-path references only — no image blobs in the query cache)
    network.ts                # connectivity awareness
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
- **Built-in equalizer** *(still lowest priority)* — cheaper than it would've been on RNTP since `BiquadFilterNode`/`WorkletNode` are already part of the audio graph. No separate native EQ module needed — insert filter nodes between source and destination when you get to it.

---

## Key Edge Cases

**Auth & connection**
- Salt/token persisted; password never stored (see Tech Stack) — re-prompt only on explicit re-login
- Self-signed certs, http vs https, malformed URLs
- Partial Subsonic API support across Navidrome versions — probe, don't assume
- Web: salt/token persisted in `localStorage` rather than an encrypted store — accepted, documented trade-off (see Tech Stack: Secrets)

**Playback**
- **Validated** (2026-07-26, build order step 0): the `<Audio>` tag component routed through `MediaElementAudioSourceNode` — not `StreamerNode`, which is HLS-oriented and still experimental for general use — is the correct primitive for a plain progressive-HTTP MP3 URL. FFmpeg (needed for proper HTTP byte-range streaming rather than a full-file download before playback starts) ships bundled and enabled by default. Confirmed working on a real device build (RN 0.86 / Expo 57, New Architecture default): play/pause/seek all functioned against a hardcoded remote MP3 in `src/app/index.tsx`. `<Audio>` also routes cleanly through `GainNode` before the destination, validating the graph-based approach the future EQ depends on.
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
5. Library browsing (artists/albums/genres) with pagination, backed by the persisted TanStack Query cache
6. Search (search3)
7. Playlists + favourites (CRUD + optimistic UI)
8. Polish: persistence, offline queue recovery, error states
9. Future features, in order: Auto DJ (cheapest, uses existing Navidrome endpoint) → scrobbling → discovery → listening stats → social/jam → gapless playback → EQ (lowest priority)

---

## Summary of Changes from Original Draft

| Area | Original draft | Revised |
|---|---|---|
| File structure | Root-level `app/` | Everything under `src/`, matching existing scaffold |
| Streaming spike timing | Step 2 | Step 0 — before any other code, given it's the highest-risk bet |
| Local persistence | "expo-sqlite (or WatermelonDB)" — undecided, cache-only framing | No local database at all — TanStack Query's persisted cache is the local library cache (`expo-sqlite/kv-store`/`localStorage`), decided after a full-mirror plan was tried and reversed in the step 4 grilling session (2026-07-26) — see Build Order step 4 and `docs/adr/0002-no-local-library-mirror.md` |
| Password storage | Plaintext password in secure storage, for token regen | Salt + token only; password never persisted |
| Gapless playback | MVP feature | Parked to future features, after core playback is proven |
| Web platform | Implied via `react-native-web` in scaffold | Explicitly out of scope for MVP; mobile-only |
| Testing | Not mentioned | Unit tests for `QueueManager` and `db/sync.ts` specifically |
