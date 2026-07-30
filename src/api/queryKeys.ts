/** Central query-key factory so prefetch calls (queryClient.ts) and the eventual library
 *  hooks (step 5) always agree on cache keys. */
export const queryKeys = {
  artists: () => ['artists'] as const,
  artistSections: () => ['artistSections'] as const,
  artist: (id: string) => ['artist', id] as const,
  album: (id: string) => ['album', id] as const,
  genres: () => ['genres'] as const,
  albumsByGenre: (genre: string) => ['albumsByGenre', genre] as const,
  /** A Home/discover shelf, keyed by its stable ShelfId (Build Order step 9). */
  albumShelf: (id: string) => ['albumShelf', id] as const,
  playlists: () => ['playlists'] as const,
  playlist: (id: string) => ['playlist', id] as const,
  starred: () => ['starred'] as const,
  /** Search results are keyed by query string. The `'search'` root key is also what
   *  queryClient.ts's dehydrate filter matches to keep search out of the persisted cache. */
  search: (query: string) => ['search', query] as const,
};
