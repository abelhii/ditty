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

**Notice**:
A transient, auto-dismissing, non-blocking message shown to the user when a background action
fails without a surface of its own to report into — e.g. a failed star or playlist edit. One
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
