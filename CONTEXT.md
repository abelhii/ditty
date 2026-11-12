# Subsonic/Navidrome Music Player

A React Native (Expo) client for Subsonic/Navidrome servers — browses a server-hosted music
catalog and streams playback of it.

## Language

**Track**:
A single playable audio item, resolved with enough metadata (title, artist, duration) and a
location to stream it from. The unit both the Library and the Queue operate on.

**Queue**:
The ordered, in-memory list of Tracks currently lined up for playback on this device, plus
the current position, shuffle, and repeat state. Transient and local — it may be seeded from
a Playlist or an album, but it isn't one.
_Avoid_: Playlist (conflating the two was a real point of confusion during the step 3 design
session — see `docs/adr/0001-player-state-flows-through-store.md`)

**Playlist**:
A named, server-persisted, user-curated list of Tracks, created/edited/deleted via the
Subsonic API. Distinct from the Queue.

**Favourite** (a.k.a. Starred):
A single Track, Album, or Artist the user has flagged via the Subsonic `star` endpoint. The
set of all flagged items (from `getStarred2`) is the user's Favourites. A Favourite is one
marked item, not an ordered list — distinct from a Playlist.
_Avoid_: "Following" — the mockup's label for a starred Artist row. There is no separate
follow relationship; Subsonic/Navidrome has no server primitive for it. Resolved via grilling
session 2026-08-28.

**Library**:
The server-backed catalog — artists, albums, tracks, genres, playlists — cached locally
for offline browsing of what's already been seen. Corresponds to Subsonic's own "media
library" (the thing `getScanStatus`/`startScan` scan); the API reserves "library" for the
catalog, so we do too.
_Avoid_: Catalog. Do **not** use "Library" for the user's personal collection (see My Music).

**My Music**:
The app's UI surface grouping the user's *personal* collections — their Playlists and their
Favourites. A navigation grouping, not a distinct domain entity, and deliberately not called
"Library" (which is the server catalog).
_Note_: the "High-Fidelity Mockups v4" design file labels this screen "Library" and its per-row
action icon "Following" (see Favourite _Avoid_ note). Both are mockup mislabels, resolved via
grilling session 2026-08-28 — the canonical terms below still stand.

**Shelf**:
A horizontal, side-scrolling carousel of albums on the Home screen, each a client-side facet over
the Subsonic `getAlbumList2` endpoint — **Recently Added** (by date added to the server), **New
Releases** (by the album's own release year), **Explore** (random). Faceted *browse*, with no text
query — distinct from Search (which is text-only and has no attribute facets). A UI grouping, not a
domain entity. Introduced in step 9.

**Notice**:
A transient, auto-dismissing, non-blocking message shown to the user when a background action
fails — or succeeds with nothing else on screen to show it (Add to Queue, Remove from Queue with
Undo) — without a surface of its own to report into, e.g. a failed star or playlist edit. One
app-level primitive, driven by a small store, mounted once near the root (same layering as the
MiniPlayer). Distinct from `QueryState`'s error state (full-surface, for a screen that has
nothing to show yet) and from Re-authentication (blocking, for a rejected session). Introduced
in step 8b.

**Re-authentication**:
Recovering a session that the server rejected mid-use (token no longer valid — password changed
server-side, user revoked) *in place*: a blocking, password-only prompt (server + username are
already known) that recomputes the token and lets playback, the Queue, and the cached Library
carry on untouched. Distinct from **Login** (cold start, no prior credentials) and **Logout**
(deliberate teardown that clears the Queue and cache). Triggered only by a Subsonic auth error
(code 40/41) on a fetch-layer request — never by a connectivity failure. Introduced in step 8b.

**Offline mode**:
The state in which only downloaded Tracks play: on when the user switched it on in Settings *or* the
device has no connection. Playback skips Tracks that aren't downloaded and their rows are greyed out.
Distinct from offline *browsing* (the persisted query cache, ADR 0002), which is always on, and from a
stream error on a connection the app believed was fine, which still halts (ADR 0007). See
`docs/adr/0011-offline-mode-skips-undownloaded-tracks.md`.
