# Music Player — agent guide

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Project conventions

TypeScript + React Native, Expo (SDK 57), expo-router, React Query (server state) and
Zustand (client/session state), pnpm. `strict` TypeScript is on — keep it that way.

### Before you write code

- Read `CONTEXT.md` first. It defines the ubiquitous language (Track, Queue, Playlist,
  Favourite, Library, My Music, Shelf, Notice, Re-authentication). Name things with those
  words; don't invent synonyms. Domain names follow the Subsonic/Navidrome API's own
  vocabulary, not another app's.
- Non-obvious design decisions live in `docs/adr/`. Skim the relevant ADR before changing
  behaviour it covers, and add a new one for decisions of similar weight.
- `PLAN.md` tracks the build in numbered steps — check where a change fits.

### Directory layout

- `src/app/` — expo-router routes only. File-system routing; nothing here is imported directly.
- `src/features/<feature>/` — feature-first code, split into `components/` and `hooks/`,
  with feature-local pure modules (e.g. `shelves.ts`, `recentSearches.ts`) at the feature root.
- `src/components/` — shared, cross-feature presentational components.
- `src/api/` — data layer: the Subsonic client (`src/api/subsonic/`), query keys, normalizers.
- `src/auth/`, `src/player/` — cross-cutting domains with their own stores and screens.
- `src/hooks/` — shared, generic hooks (theme, color scheme, debounce).
- `src/constants/`, `src/utils/` — theme tokens and small helpers.

Put new code in the feature it belongs to. Promote to `src/components` / `src/hooks` only
once a second feature actually needs it.

### Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Component file | `PascalCase.tsx`, one component, named to match | `AlbumTile.tsx`, `NowPlayingScreen.tsx` |
| Full-screen component | `<Thing>Screen.tsx` | `SearchScreen.tsx`, `AlbumDetailScreen.tsx` |
| Feature hook | `useThing.ts` (camelCase) | `useAlbum.ts`, `useSearch.ts` |
| Store (Zustand) | `useThingStore.ts` | `usePlayerStore.ts`, `useAuthStore.ts` |
| Pure module / data layer | `camelCase.ts` | `queryKeys.ts`, `starredCache.ts` |
| Test | co-located `<name>.test.ts(x)` | `normalize.test.ts` |
| Platform variant | `<name>.web.ts(x)` / `.ios` / `.android` | `kvStorage.web.ts` |
| Route (expo-router) | kebab-case dirs, `[param].tsx`, `_layout.tsx`, `index.tsx` | `album/[id].tsx` |

### Code style

- **Named exports**, everywhere except expo-router route files, which must `export default`.
- Components are `function` declarations, not arrow consts. Props are a `type` named
  `<Component>Props`, declared directly above the component. Prefer `type` over `interface`.
- Imports in two groups separated by a blank line: external packages first, then `@/…`
  internal modules. Use the `@/*` path alias (maps to `src/*`) — never deep relative
  `../../..` paths across features. `import type` for type-only imports.
- Server/remote state → React Query, keyed through `src/api/queryKeys.ts` (never inline
  key arrays). Client/session/UI state → a Zustand store. Don't duplicate server data into
  a store.
- Keep components presentational; put data fetching and logic in a hook. Keep pure logic
  (filtering, faceting, normalizing) in plain `.ts` modules so it's unit-testable without
  rendering — that's why they sit beside the components rather than inside them.
- Style with `StyleSheet.create`; pull colours and spacing from `src/constants/theme.ts`,
  not literals.

### Tooling

- `pnpm lint` (eslint via `expo lint`) and `pnpm test` (jest + @testing-library/react-native)
  must pass. Co-locate tests next to what they cover.
- pnpm only — don't introduce `npm`/`yarn` lockfiles.
- Add pure-logic tests for anything non-trivial; components are exercised through
  @testing-library/react-native.
