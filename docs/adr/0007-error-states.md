# Step 8b error states: halt-and-surface playback, in-place re-authentication, and a transient Notice

**Status**: accepted (step 8b — error states). Corrects the connectivity rationale in
`docs/adr/0006-local-only-queue-persistence.md`.

Step 8b makes the app's failure modes visible and recoverable. Today the gaps are: a failed
stream sets `status: 'stopped'` silently and strands the player on a dead track; a token rejected
mid-session isn't handled at all (`SubsonicApiError.isAuthError` exists but nothing consumes it);
and optimistic mutations (star, playlist CRUD) roll back **silently**. Queries were already
covered by `QueryState` (loading / error+retry / empty / success). 8b is one slice, sequenced
internally: build two foundations first, then wire three consumers onto them.

## Foundations

- **`Notice` primitive.** One hand-rolled transient, auto-dismissing, non-blocking message, driven
  by a small store and mounted once near the root — same layering as the MiniPlayer
  (`docs/adr/0005-miniplayer-js-overlay-not-native-accessory.md`). It carries an optional action
  slot, but 8b populates it nowhere. **Notice is reserved for actions with no surface of their own
  to report into** (i.e. mutations) — distinct from `QueryState`'s full-surface error and from the
  blocking re-auth modal.
- **`utils/network.ts` connectivity probe.** A thin wrapper over `expo-network`
  (`getNetworkStateAsync` / `useNetworkState`; iOS/Android/Web). **Re-justified relative to ADR
  0006**, which claimed the seam was needed so mid-session auth rejection could tell "token
  rejected" from "just offline." That rationale is wrong: the request layer already throws
  `SubsonicNetworkError` when `fetch` fails (offline/unreachable) versus `SubsonicApiError` (code
  40/41) when the server *responds* rejecting the token — a code-40 error is definitionally a
  server response, never "offline." Re-login keys off the **error class**, not the probe. The probe
  earns its place for the two cases 0006 didn't name: (1) the `<Audio onError>` callback is opaque
  (no code, no class), so connectivity is the only side-channel to word a stream failure as offline
  vs. a genuine bad stream; and (2) `QueryState` currently *guesses* "You're offline" for every
  `SubsonicNetworkError`, which also fires when the server is down and the device is fine.

## Decisions

- **Playback failure halts; it does not auto-advance.** A stream error sets a new explicit
  `'error'` playback status (added to `idle|loading|playing|paused|stopped`), surfaced **inline in
  the transport** (MiniPlayer + now-playing) with the play button doubling as **Retry**. The
  message is flavoured by the probe ("You're offline" vs "Couldn't play this track"). Auto-advance
  is rejected: offline, *every* track fails, so auto-skip would blast through the whole queue and
  destroy its position — the fix (skip only when online, plus a consecutive-failure guard) is real
  machinery for the modest benefit of skipping one dead track. Halt + Retry has no runaway risk.
- **Mid-session auth rejection triggers in-place Re-authentication, not logout.** Detected in a
  **global `QueryCache`/`MutationCache` `onError`** (keeps `request()` pure of auth/navigation
  concerns): `error instanceof SubsonicApiError && error.isAuthError`. An idempotent
  `sessionExpired()` flag collapses N concurrent rejections to **one** blocking, password-only
  modal (server + username are already known). On success: recompute salt+token, persist,
  clear the flag, `invalidateQueries`. The **Queue, query cache, and nav position all survive** —
  this realises the Tech Stack commitment that the password is "re-prompted only on explicit
  re-login (token rejected, password changed server-side)." Failed **mutations are not
  auto-replayed** (create-playlist etc. aren't safely idempotent); the user re-does that one
  action, while idempotent queries refetch for free. The modal shows an **inline error** on
  repeated rejection and a **"Sign out" escape** routing to the real `logout()` — the only
  mid-session path that clears the Queue, now an explicit user choice, not an automatic consequence.
- **Failed mutations surface a Notice, fired centrally.** The same global `MutationCache.onError`
  fires the Notice, reading per-mutation `meta: { action }` for the wording (the six hooks each gain
  a `meta` line; rollback stays in each hook's own `onError`). Wording keys off **error class**
  (`SubsonicNetworkError` → "You're offline — change not saved"; otherwise "Couldn't {action}"),
  consistent with `QueryState` — so the probe's only consumers stay playback and query messaging.
  **No Retry** (every one of these mutations fires from a visible, re-tappable affordance). The
  Notice is **suppressed when the error is an auth rejection** — Re-authentication owns that case.

Persisted state is unchanged from 8a; 8b adds behaviour and one new `usePlaybackStatusStore`
status value, no new persisted payload.

## Considered Options

**Auto-advance past a failed track.** Rejected — see above; the offline runaway-skip failure mode
outweighs the benefit, and guarding it is disproportionate machinery for MVP.

**Full logout on mid-session token rejection.** Rejected: `logout()` clears the Queue and the whole
query cache, punishing the user's session for a recoverable credential blip. In-place re-auth keeps
everything and matches the plan's stated intent. (Logout remains available as the modal's escape.)

**A proactive global "you're offline" banner.** Rejected for 8b — that's a feature (needs
connectivity subscription + AppState wiring), not error handling. The probe is used *reactively*
only, to flavour messages at the point of failure.

**Retry action on mutation Notices.** Rejected: the redo affordance (star button, track menu,
playlist screen) is already on screen, so a Notice-level Retry would duplicate it and add
callback-plumbing to the Notice store.

## Consequences

- `usePlaybackStatusStore`'s `PlaybackStatus` union gains `'error'`; `AudioEngine`'s `onError` sets
  it (and fills the offline-vs-failed reason a beat later, since the probe read is async), and
  MiniPlayer / now-playing render the inline error + Retry.
- The `QueryClient` gains `QueryCache`/`MutationCache` `onError` handlers — the single place that
  reacts to auth rejection and fires mutation Notices. `request()` stays a pure API function.
- `useAuthStore` gains a `sessionExpired()` action + a re-auth flag and modal; `logout()` is
  unchanged and reused as the escape.
- Mutation hooks each declare `meta: { action }`; their `onError` rollback logic is untouched.
- **Deferred to later steps:** auto-advance/skip on playback failure, a proactive offline banner,
  and (still, from 8a) cross-device sync and intra-track position resume.
