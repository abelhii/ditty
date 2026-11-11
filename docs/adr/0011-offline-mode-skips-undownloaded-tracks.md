# 0011 — Offline mode skips tracks that aren't downloaded (instead of halting)

**Status**: accepted. Departs from the halt-on-error behaviour in `docs/adr/0007-error-states.md` for
one case only; everything else in 0007 stands. Builds on ADR 0002 (downloads are the one thing that
needs real local durability) and the download work tracked in issues #37–#45.

## Context

ADR 0007 makes playback *halt* on a stream error rather than auto-advance: offline, every stream
fails, so auto-skipping would race through the whole Queue in seconds. That is right when the app
doesn't know it is offline. With downloads there is now a third case: the app knows it can't stream
(no connection, or the user turned Offline mode on) and knows exactly which Tracks it *can* play.

## Decision

- **Offline mode** is on when the user's toggle is on *or* the device reports no connection
  (`expo-network`, native only). The two flags are stored separately, so regaining signal never
  switches off a deliberate manual choice. Only the manual flag is persisted.
- While Offline mode is on, `PlaybackController` skips Tracks that aren't downloaded: starting a queue
  at an undownloaded Track moves to the next downloaded one, and next/previous step past undownloaded
  Tracks (`player/offline-skip.ts`). The skip is bounded by the queue length and stops when a step
  doesn't move (repeat-one, `previous` at the start). If nothing ahead is playable the queue finishes.
- Track rows for undownloaded Tracks are greyed out and inert while Offline mode is on.
- The halt-and-retry path (ADR 0007) is unchanged for everything else — in particular for a stream
  failing when the app *thought* it was online.
- Album detail falls back to the album's downloaded Tracks when offline with nothing cached. The
  fallback is derived in the hook and never written to the query cache.

## Consequences

- A downloaded album played offline works end to end; an album only partly downloaded plays just the
  downloaded part.
- The fallback album is partial and unordered by track number (the downloaded `Track` carries no
  track number) with no year or starred state. Playlists have no equivalent fallback yet: playlist
  names aren't stored with downloads.
- Offline mode does nothing on web, which can't download.
