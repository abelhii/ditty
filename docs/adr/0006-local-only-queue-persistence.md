# Queue persistence is local-only: restore the queue paused, from the start of the current track

**Status**: accepted (step 8a — persistence). Supersedes the "server-first vs. local-cache-plus-sync"
deferral noted against `getPlayQueue`/`savePlayQueue` in PLAN.md.

Killing the app today loses the queue entirely — `usePlayerStore` is in-memory only. Step 8a makes
the queue durable across restarts. The Subsonic API offers a server-side mechanism
(`savePlayQueue`/`getPlayQueue`, cross-device), but 8a deliberately does **not** use it. Restore is
**local-only, offline, paused, and starts the current track from position 0.**

A verified fact forced part of this: `savePlayQueue` stores only a track-id list, the current id, and
a position (ms) — **not** `shuffle`, `repeat`, or the unshuffled `originalOrder` that `QueueState`
carries. So local persistence is mandatory *regardless* — even a pure-server design would need a local
sidecar just for shuffle/repeat. Given that, server-first would mean building local persistence and
then subordinating it for no benefit. Cross-device (server sync) and intra-track position resume are
clean follow-ups, deferred out of 8a.

## Decisions

- **Local-only, paused, from 0.** On launch, restore `queue` (including `shuffle`/`repeat`/
  `originalOrder`) from local storage, current track cued but **paused**, position 0. No
  `savePlayQueue`/`getPlayQueue`, no cross-device, no intra-track resume.
- **Offline recovery is a free property, not a feature.** Local restore never touches the network,
  so there is nothing to "recover from" offline. The connectivity seam (`utils/network.ts`) is
  deferred to 8b. _(Correction, step 8b — see `docs/adr/0007-error-states.md`: the seam is **not**
  needed to tell "token rejected" from "just offline" for re-login, as this bullet originally
  claimed — the error class already does that, `SubsonicApiError` code 40/41 vs `SubsonicNetworkError`.
  The probe earns its place instead for opaque `<Audio>` playback errors and honest query messaging.)_
- **Keep zustand `persist`; split the store.** `usePlayerStore` is wrapped in `persist` with
  `partialize: (s) => ({ queue: s.queue })`. The observed fields `status` + `position` move into a
  new `usePlaybackStatusStore` so the ~1/sec `setPosition` tick during playback never triggers a
  write. This sharpens the proposed/observed boundary ADR 0001 already draws.
- **Clear on logout.** The persisted queue holds server-specific track IDs, so `logout()` clears it
  alongside the existing `queryClient.clear()`.
- **Clamp the restored index.** If a saved `currentIndex` is off the end (a queue that ran to
  completion, `QueueManager.next` → `tracks.length`), snap it to `0` so "reopen → hit play" works.
  An empty queue restores verbatim.
- **Version + reset-on-corruption.** `version: 1`; a corrupt or version-mismatched blob resets to an
  empty queue rather than crashing — mirroring `useAuthStore.hydrate`'s corrupt-storage-resets
  handling. Real `migrate()` functions are deferred until a `Track` shape change forces one.

Persisted payload: `{ queue: { tracks, originalOrder, currentIndex, shuffle, repeat } }`.

## Considered Options

**Server-first (`getPlayQueue` on launch, `savePlayQueue` on mutation).** Rejected for MVP: it can't
store shuffle/repeat/originalOrder (so needs a local sidecar anyway), can't run offline, and adds a
cross-device conflict surface for a benefit — two devices against the same Navidrome mid-session —
that isn't part of current usage.

**Persist intra-track position (resume the exact second).** Rejected for 8a. `persist` writes on
*every* `setState` (verified: `node_modules/zustand/esm/middleware.mjs:366` — `partialize` shrinks the
*payload*, it does not gate write *frequency*). Tracking position would mean either ~1 SQLite write/sec
during playback or extra throttle + AppState-background-flush + seek-on-reload machinery. "Reopen,
queue intact, hit play" is ~90% of the value; exact resume is a clean follow-up for the last 10%.

**Hand-rolled `subscribe` instead of `persist`.** Rejected: `persist` (once the store is split so
position ticks don't reach it) gives versioning/migration/hydration for free, which a persisted
`Track[]` blob will eventually need.

## Consequences

- A new `usePlaybackStatusStore` holds `status` + `position`; `AudioEngine`, `MiniPlayer`,
  `NotificationBridge`, and `useProgress` read/write it instead of `usePlayerStore`. Anyone touching
  playback state now picks the right store — proposed (`usePlayerStore`) vs observed
  (`usePlaybackStatusStore`).
- `shuffle`/`repeat` survive restarts for free, since they ride inside the persisted `queue`.
- A queue that finished last session re-cues from its top on relaunch (index clamp), rather than
  reopening to a dead player.
- **Deferred to later steps:** cross-device sync (`savePlayQueue`/`getPlayQueue`), intra-track
  position resume, real schema `migrate()` handlers. 8b (error states) is a separate slice.
