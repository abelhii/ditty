import type { StarKind } from '@/api/subsonic/endpoints/annotations';
import type { Album, Artist, Track } from '@/api/types';

/** The three Favourites collections, as returned by getStarred2 (see annotations.getStarred). */
export type StarredCollections = {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
};

/** A favouritable item together with its kind — the payload the star/unstar mutations carry so
 *  they can optimistically patch the right {@link StarredCollections} bucket. */
export type StarTarget =
  | { kind: 'song'; item: Track }
  | { kind: 'album'; item: Album }
  | { kind: 'artist'; item: Artist };

/** Inserts a freshly-starred item at the front of its collection. Idempotent: re-starring an item
 *  already present is a no-op rather than a duplicate. */
export function addToStarred(collections: StarredCollections, target: StarTarget): StarredCollections {
  switch (target.kind) {
    case 'song':
      return collections.tracks.some((t) => t.id === target.item.id)
        ? collections
        : { ...collections, tracks: [{ ...target.item, starred: true }, ...collections.tracks] };
    case 'album':
      return collections.albums.some((a) => a.id === target.item.id)
        ? collections
        : { ...collections, albums: [{ ...target.item, starred: true }, ...collections.albums] };
    case 'artist':
      return collections.artists.some((a) => a.id === target.item.id)
        ? collections
        : { ...collections, artists: [{ ...target.item, starred: true }, ...collections.artists] };
  }
}

/** Removes an unstarred item from its collection by id. */
export function removeFromStarred(
  collections: StarredCollections,
  kind: StarKind,
  id: string,
): StarredCollections {
  switch (kind) {
    case 'song':
      return { ...collections, tracks: collections.tracks.filter((t) => t.id !== id) };
    case 'album':
      return { ...collections, albums: collections.albums.filter((a) => a.id !== id) };
    case 'artist':
      return { ...collections, artists: collections.artists.filter((a) => a.id !== id) };
  }
}
