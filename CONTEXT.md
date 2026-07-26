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

**Library**:
The server-backed catalog — artists, albums, tracks, genres, playlists — mirrored locally
(in SQLite) for offline browsing.
_Avoid_: Catalog
