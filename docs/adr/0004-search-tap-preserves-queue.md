# Tapping a song in Search preserves the queue; tapping one in album detail replaces it

**Status**: accepted

The same `TrackRow` component is tapped in two places, and — deliberately — the two taps do
different things to the Queue.

- **Album detail** (step 5): tapping a track calls `PlaybackController.play(tracks, index)`,
  which *replaces* the whole Queue with the album, starting at the tapped track. This is the
  intent there: "make this album my Queue."
- **Search** (step 6): tapping a song must *not* destroy whatever the user already has queued.
  Instead it plays now while keeping the existing Queue:
  - **Queue exists** → a new `PlaybackController.playNow(track)` inserts the song at the current
    position and starts it immediately; the previously-playing track becomes the next one, and
    the rest of the Queue is preserved intact after it.
  - **No Queue** → fetch `getAlbum(song.albumId)` and play that album from the tapped song
    (a richer starting Queue than a lone track), falling back to a single-track Queue if the
    fetch fails (offline / album not cached).

A search song tap therefore *always* produces sound, and *never* discards an existing Queue.

## Considered Options

**Make search taps queue-replacing too** (reuse `play(songResults, index)`, the songs section
as the Queue) was the consistent, zero-new-code option. Rejected: search is an exploratory
context — a user who has a carefully built Queue playing and taps a song they searched for to
hear it *now* would lose that Queue with no undo. Replacing the Queue is a fine default when the
user is looking at a cohesive album; it's a hostile one when they're poking at loose search hits.

**Make search taps silent** (`playNext` / "add to top" without starting playback) was the other
end. Rejected during the grilling session: it makes the same gesture audible in one branch
(no-Queue → play the album) and silent in another, so what a tap *does* depends on hidden state.
"Play now, keep the rest" is audible and predictable in both branches.

**Unify the two screens** on either behavior was considered and rejected: the divergence is the
point. The two screens encode two genuinely different user intents, and collapsing them would
make one context worse to satisfy a consistency that users don't actually experience as such
(they're never comparing the two taps side by side).

## Consequences

- A new `PlaybackController.playNow(track)` operation exists alongside `play`/`playNext`/
  `addToQueue` — "insert at the current position and play immediately, preserving the rest."
- A future reader will notice `TrackRow`'s `onPress` means different things in `AlbumDetailScreen`
  vs the search results and might read it as an inconsistency; this ADR is the record that it is
  intentional.
- The no-Queue branch does a network fetch (`getAlbum`) on tap, with an offline/uncached
  fallback to the single track — a small latency and failure surface the album-detail path
  doesn't have.
