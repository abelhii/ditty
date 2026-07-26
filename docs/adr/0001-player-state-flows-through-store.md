# Player state flows through `usePlayerStore`, not through direct engine calls

**Status**: accepted

`react-native-audio-api`'s `<Audio>` component has no imperative "load a new track" method — it
only reacts to prop changes — so `AudioEngine` can't be a headless class; it has to be backed by
a persistently-mounted piece of React. That forced a choice for how `PlaybackController`,
`NotificationBridge`, and the UI talk to it: call an imperative engine object directly, or route
every intent through the shared Zustand store (`usePlayerStore`) and let the engine react to it.

We chose the reactive model. `PlaybackController` only ever writes *proposed* state into
`usePlayerStore`; `AudioEngine` is the only thing that touches the `<Audio>` ref/`AudioContext`
graph, and the only thing that writes *observed* facts (position, playback status,
interruption-driven pauses) back into the store. There is exactly one source of truth for
"what's playing," and every other consumer (UI, `NotificationBridge`) reads from it.

## Considered Options

An imperative engine object (`engine.play()` / `engine.loadTrack()`, called directly by
`PlaybackController`, which separately updates the store for UI rendering) was the more direct,
familiar alternative — closer to how the build-order step 0 spike called `audioRef.current?.play()`
directly. Rejected because it creates two representations of playback state — the engine's
internal state and the store — with no structural guarantee they stay in sync. If `loadTrack()`
resolved but `play()` threw, the store could say "playing track X" while nothing was actually
loaded, and nothing would catch that beyond careful manual sequencing in `PlaybackController`.

## Consequences

`AudioEngine`'s effect logic needs care to avoid double-fires or races when store state changes
rapidly (e.g. repeated skip taps) — the cost paid to eliminate the dual-state-drift failure mode
above.
