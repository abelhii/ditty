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
| Server data | TanStack Query (React Query) | Orchestrates fetch/refetch/retry against the Subsonic API; writes results into the local SQLite mirror rather than being the cache of record (see Local persistence) |
| Local persistence | **`expo-sqlite`** (source of truth for offline library browsing) | Chosen over WatermelonDB — the data shape (tracks/albums/artists/genres/playlists) is simple relational data with mostly one-way server→local sync, not high-frequency bidirectional reactive writes, so WatermelonDB's reactive-ORM layer would be redundant given TanStack Query already provides the reactive/refetch layer. Optionally paired with `drizzle-orm` for typed queries/migrations. MMKV for fast key-value (settings, queue snapshot). |
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
        browsing.ts           # getArtists, getAlbum, getSong...
        search.ts
        playlists.ts
        media.ts               # stream/download URL builders
        annotations.ts        # star, scrobble, rating
      types.ts
      errors.ts
    types.ts                    # normalized app-level models (Track, Album...)

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

  db/
    schema.ts                 # sqlite tables: cached library (source of truth), queue snapshot
    sync.ts                   # incremental library sync logic (unit tested)

  auth/
    useAuthStore.ts            # server URL, salt/token (no password persisted)
    ServerConfigScreen.tsx

  components/                 # shared UI (TrackRow, AlbumGrid, MiniPlayer...)
  utils/
    cache.ts                  # image cache management (file-path references only — no image blobs in SQLite)
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
- Persist queue + playback position across app restarts
- **Lock-screen / notification playback controls (iOS & Android)** — play/pause/skip, artwork, scrubber, and (Android) a persistent media-style notification with a dismiss action; wired through `react-native-audio-api`'s `PlaybackNotificationManager`, kept in sync with `PlaybackController` state so controls stay correct across backgrounding/kill

**Offline library browsing** *(pulled into MVP from the original "decide scope later" edge case)*
- Full local SQLite mirror of library metadata (tracks/albums/artists/genres/playlists) as source of truth
- TanStack Query orchestrates fetch/sync from the Subsonic API into SQLite; screens read from SQLite, not directly from the network
- Cost estimate: ~500–800 bytes/track row including indexes → roughly 5–8MB for a 10k-track library, 30–50MB for 50k tracks, 70–100MB for 100k+ tracks. Negligible against device storage. Cover art is **not** blobbed into SQLite — file-path references only, backed by `expo-image`'s disk cache / `utils/cache.ts`.
- Explicitly distinct from **offline playback** (downloaded audio files) — that stays a future feature; a single downloaded track (~5–8MB) costs more storage than the entire metadata mirror of a large library, so it needs its own quota/download-manager design later.

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
- Unit tests for `QueueManager` (shuffle/repeat/queue-mutation logic) and `db/sync.ts`
  (merge/conflict logic, e.g. server-side deletes or ID changes mid-sync) — these are
  pure-logic modules where silent bugs are costly and hard to spot manually.
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
- Audio focus interruptions (calls, other apps, Bluetooth)
- Notification/lock-screen control state staying in sync with actual playback state across OS-level kills — manual state syncing in `NotificationBridge` on every transition

**Library**
- Pagination for large libraries (10k+ tracks)
- IDs aren't always stable across rescans — prefer MusicBrainz IDs for long-lived references (favourites, stats)
- Incremental sync rather than full re-pull (`db/sync.ts`, unit tested)

**Queue**
- Recently-played ring buffer for shuffle
- "Play next" vs "add to queue" distinction
- Persisting reorder/repeat/shuffle state

**Search**
- `search3` returns artists/albums/songs in one call — design UI around combined results, not three separate requests

---

## Build Order

1. **Streaming spike** (moved ahead of everything else) — bare dev client, hardcoded progressive-HTTP URL, confirm `react-native-audio-api` plays it correctly and works on New Architecture. No Subsonic client code yet — if this fails, the whole audio-library choice needs revisiting before anything else is built on top of it.
2. Dev client setup (local prebuild) + Subsonic auth/client skeleton (salt+token only)
3. `react-native-audio-api` integration: `AudioEngine`, `QueueManager` (+ unit tests), `PlaybackController`, `NotificationBridge` (lock-screen/notification controls)
4. Local DB layer: `expo-sqlite` schema + `db/sync.ts` (+ unit tests) — lands before library browsing since browsing reads from the SQLite mirror, not directly off the network
5. Library browsing (artists/albums/genres) with pagination, backed by the SQLite mirror
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
| Local persistence | "expo-sqlite (or WatermelonDB)" — undecided, cache-only framing | `expo-sqlite` decided; promoted to source-of-truth for full offline library browsing (in MVP) |
| Password storage | Plaintext password in secure storage, for token regen | Salt + token only; password never persisted |
| Gapless playback | MVP feature | Parked to future features, after core playback is proven |
| Web platform | Implied via `react-native-web` in scaffold | Explicitly out of scope for MVP; mobile-only |
| Testing | Not mentioned | Unit tests for `QueueManager` and `db/sync.ts` specifically |
