# The persistent MiniPlayer is a hand-rolled JS overlay, not `NativeTabs.BottomAccessory`

**Status**: accepted

Decided during the step 7 grilling session (2026-07-28). The app uses `expo-router`'s
`NativeTabs`, and Expo v57 ships `NativeTabs.BottomAccessory` — a first-class persistent-accessory
component built for exactly the mini-player-above-the-tab-bar pattern. We are deliberately *not*
using it (yet): the MiniPlayer is a plain React Native view mounted as a sibling of `NativeTabs` in
`_layout.tsx`, positioned above the tab bar via safe-area insets + the tab-bar height, and driven by
`usePlayerStore`. A future reader will find `BottomAccessory` in the docs and reasonably ask "why
didn't they just use this?" — this is the answer.

The reason is cross-platform parity. `NativeTabs.BottomAccessory` is **iOS-only** — it wraps iOS 18's
`UITabBarController` bottom accessory, and there is no Android or web equivalent (web `NativeTabs`
falls back to a basic iPad-style layout). Our platform scope is mobile-first with iOS and Android as
co-equal targets, so a persistent player that only exists on iOS isn't acceptable for the MVP. A
single JS overlay renders identically on iOS, Android, and web from one implementation and one state
source, which is worth more right now than iOS-native docking polish. This also matches the
platform-branching the codebase already uses elsewhere (`kvStorage`, secrets storage,
`computeToken`, `app-tabs.web.tsx`) — but here we consolidate to *one* implementation rather than
branching, because the JS overlay is good enough on all three.

## Considered Options

Use `NativeTabs.BottomAccessory` on iOS and a JS overlay on Android/web — rejected: two MiniPlayer
implementations to keep in sync for a bar that's the same three controls everywhere, and the native
version's win (proper native docking/blur/minimize-on-scroll) doesn't justify the divergence for
MVP. It remains the obvious upgrade path if iOS polish becomes a priority.

## Follow-on (step 7a implementation, 2026-07-29)

The same reasoning was extended to the **now-playing** and **queue** surfaces during 7a. The plan
originally sketched them as `player/now-playing.tsx` / `player/queue.tsx` *router modal routes*, but
`NativeTabs` is mounted directly as the root navigator (no root `Stack`, no `(tabs)` group — a
deliberate structure), and expo-router can't present a sibling modal route that covers native tabs
without wrapping them in a root `Stack`. Rather than restructure the already-working tab/auth root
(untestable on-device here), both are built as full-screen JS overlays driven by `usePlayerUiStore`
and mounted alongside the MiniPlayer in `_layout.tsx` — the same overlay pattern as the MiniPlayer,
for the same cross-platform reason. Swipe-to-dismiss and drag-reorder are hand-rolled on
`Animated` + `PanResponder` (no reanimated dependency). The router-modal approach remains a clean
upgrade if a root `Stack` is introduced later.

## Consequences

The overlay has to position itself above a *native* tab bar it doesn't own — the fiddly part
`BottomAccessory` would have handled for free. It reads the tab-bar height + safe-area insets to sit
in the right place, and that offset is the most likely thing to need per-platform tweaking. Swapping
in the native accessory on iOS later is a contained change (the MiniPlayer's contents and its
`usePlayerStore` wiring don't change — only where/how it's mounted), so nothing here is hard to walk
back.
