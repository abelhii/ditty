# Auto-DJ refills the Queue client-side from random, genre and similar-song pools

**Status**: accepted (Auto-DJ, issue #41)

Auto-DJ keeps playback going: when the Queue runs low, `PlaybackController` appends a batch of
generated Tracks, so the Queue never runs off the end.

## Decisions

- **Refill, don't generate on demand.** After `skipNext`, and when Auto-DJ is switched on, if 2 or
  fewer Tracks remain after the current one, a batch of 10 is appended with `QueueManager.enqueue`.
  The Queue stays the single source of truth for what plays next (ADR 0001); `AudioEngine` is
  untouched. If the Queue had already run off the end when the batch lands, playback resumes on the
  first new Track.
- **Three pools, one pure picker.** `getRandomSongs` filtered to the current Track's genre,
  `getRandomSongs` unfiltered, and `getSimilarSongs2` for the current Track's artist. `auto-dj.ts`
  (`pickNextBatch`) mixes them: each slot takes from the any-genre pool with probability
  `randomness` (0.3), otherwise from similar-then-genre; a dry pool falls through to the others.
- **Similar songs are optional.** Navidrome only answers `getSimilarSongs*` with its Last.fm
  integration enabled; otherwise the list is empty, which is not an error. Genre-random is the
  floor, so the feature works on any Navidrome. The genre filter of `getRandomSongs` has not yet
  been verified against a real Navidrome instance.
- **No repeats.** Skipped ids: everything already in the Queue plus the last 50 ids Auto-DJ added
  (session-only), so a new Queue doesn't replay what was just generated.
- **Not persisted, not in `QueueState`.** The flag lives in `use-auto-dj-store`, so ADR 0006's
  persist version stays at 1. The settings issue (#43) decides what becomes durable and
  configurable.
- **Repeat wins.** With repeat all/one the Queue never ends, so Auto-DJ does nothing.
- **Failures are quiet.** If the genre and any-genre fetches both fail, one Notice per session;
  the existing Queue keeps playing.

## Consequences

- `Track` gains optional `artistId` and `genre`. Tracks persisted before this change lack them, so
  Auto-DJ falls back to any-genre picks until the user plays a freshly loaded Track.
- Generated Tracks are not marked in the Queue view; a clean follow-up if wanted.
