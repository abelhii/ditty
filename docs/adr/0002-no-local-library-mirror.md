# No local database mirror of the library — TanStack Query's persisted cache is the local library cache

**Status**: accepted

The original plan called for a full SQLite mirror of the catalog (artists/albums/tracks/genres/
playlists) as the source of truth for offline browsing, synced incrementally from the Subsonic
API. Revisited during the step 4 grilling session (2026-07-26) once two things became clear: the
Subsonic API has no incremental-fetch primitive for ID3-organized data (`getArtists`/
`getAlbumList2` have no changed-since parameter; only the older file-structure `getIndexes`
supports `ifModifiedSince`, and it doesn't map onto ID3 artist/album/track IDs), and reviewing a
real Subsonic client (tempus, a fork of Tempo) showed it doesn't mirror the catalog locally at
all — its local database only stores things that need genuine local durability (downloads,
favourites, playlists, queue, recent searches), and artist/album/song browsing hits the network
live on every request. Spotify's public-facing offline behavior follows the same shape: an
opportunistic cache for browsing, and a wholly separate, explicit-download mechanism for offline
audio that never shares storage with the metadata cache.

We dropped the SQLite mirror and let TanStack Query's own cache serve as the local library
cache, persisted via `@tanstack/react-query-persist-client` + `createAsyncStoragePersister`,
backed by a platform-branched key-value store (`expo-sqlite/kv-store` on native, `localStorage`
on web). Top-level lists (`getArtists`, `getGenres`, `getPlaylists`, `getStarred2`) are
prefetched on login; everything else (an artist's albums, an album's tracks) is fetched lazily
on navigation and cached from then on.

## Considered Options

A full SQLite mirror, eagerly or incrementally synced, was the original plan — it would give
true full-library offline browsing and fast local sort/filter without hitting the network.
Rejected for MVP: since the API can't report what changed, "incremental" could only ever mean
"pull the full catalog every sync, diff client-side" — real cost for a large library, and more
code (schema, migrations, a diff/merge engine) than a project this size needs when no found
prior art actually builds it this way.

A middle ground — write-through, opportunistically upserting into real SQLite tables as the
user browses rather than an eager full crawl — was also considered. Rejected in favor of the
simpler option: a persisted TanStack Query cache gives the same "what you've seen stays
available offline" behavior with no hand-written schema/upsert code, since MVP browsing is
purely hierarchical drill-down — no local sort/filter/search requirement, since search and
favourites are both server-aggregated (`search3`, `getStarred2`).

## Consequences

Local browsing is limited to "revisit what's been fetched before" — there's no way to browse or
search the full library from a cold cache with no network. If that becomes a real requirement
later, a proper SQLite mirror (with the diff/merge cost described above) is the documented
fallback, not a full rewrite — `api/normalize.ts`'s raw-to-app-model mapping functions would
carry over unchanged.
