# Cover art is fetched at fixed, per-context sizes via `expo-image`, not a hand-rolled cache

**Status**: accepted

Every step 5 library screen needs cover art, and Subsonic's `getCoverArt` supports an optional
`size` param that the server scales to before responding. Decided during the step 5 grilling
session (2026-07-27): request a small size for list rows and a larger size for detail headers,
rather than always fetching one full-size image and downscaling client-side, and render it with
`expo-image` rather than building the `utils/cache.ts` module the original plan's file structure
had named but never implemented. Two fixed sizes for now — `150` (list rows/thumbnails) and `600`
(album/artist detail headers) — defined as a shared constant so every call site agrees.

The full-size-and-downscale alternative looks simpler but costs more than it saves: a 1MB+
source image is typically 2000px+ per side, and decoding it (even just to downscale for display)
allocates a full uncompressed bitmap in memory — roughly `width × height × 4` bytes, ~16MB for a
2000×2000 source — regardless of the on-screen size. That's real jank/OOM risk scrolling a long
album grid. Requesting a size close to the actual display resolution avoids both the network and
decode cost. `expo-image`'s built-in disk+memory cache also satisfies the original plan's "no
image blobs in the query cache" constraint for free — cover art is a signed URL passed straight to
`<Image>`, never TanStack Query state — so a hand-rolled cache module has no gap left to fill.

## Considered Options

Fetch one full-size image per cover art ID and let `expo-image`/the OS downscale for every
context (list row and detail header alike) — rejected for the decode-cost reason above; the
network savings alone undersell the case, but the memory cost while scrolling a grid does not.

A hand-rolled `utils/cache.ts` (file-path references on disk, manual eviction) — this was the
original plan's stated approach. Rejected: `expo-image` already provides disk-backed caching, and
nothing in the actual requirement (avoid blobs in the query cache) needs more than that.

## Consequences

`expo-image` caches by URL, so `size=150` and `size=600` requests for the same cover art are two
separate cache entries — viewing a thumbnail then the detail header for the same album downloads
twice, not once. Accepted; not worth a shared-cache-key scheme for two fixed sizes.

A third, larger size for tablet/wide-web layouts is deliberately deferred, not overlooked — there's
no tablet/web album grid or detail layout designed yet to size a third tier *for*, and picking a
pixel number without one would be a guess. When one is added, the trigger should be device pixel
ratio × the image's actual logical-pixel render size at that breakpoint, not "tablet vs phone" as
a proxy for it.
