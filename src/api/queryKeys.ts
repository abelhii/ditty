/** Central query-key factory so prefetch calls (queryClient.ts) and the eventual library
 *  hooks (step 5) always agree on cache keys. */
export const queryKeys = {
  artists: () => ['artists'] as const,
  artistSections: () => ['artistSections'] as const,
  artist: (id: string) => ['artist', id] as const,
  album: (id: string) => ['album', id] as const,
  genres: () => ['genres'] as const,
  albumsByGenre: (genre: string) => ['albumsByGenre', genre] as const,
  playlists: () => ['playlists'] as const,
  starred: () => ['starred'] as const,
};
