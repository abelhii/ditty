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
