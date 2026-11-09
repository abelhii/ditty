import type { Album, Artist, Track } from '@/api/types';
import { addToStarred, removeFromStarred, type StarredCollections } from '@/features/favourites/starred-cache';

function track(id: string, starred = false): Track {
  return { id, title: `Track ${id}`, artist: 'Artist', album: 'Album', duration: 180, starred };
}
function album(id: string, starred = false): Album {
  return { id, name: `Album ${id}`, artist: 'Artist', songCount: 1, duration: 100, starred };
}
function artist(id: string, starred = false): Artist {
  return { id, name: `Artist ${id}`, albumCount: 1, starred };
}

const empty: StarredCollections = { artists: [], albums: [], tracks: [] };

describe('addToStarred', () => {
  it('prepends the item to the matching collection and marks it starred', () => {
    const result = addToStarred(empty, { kind: 'song', item: track('s1') });
    expect(result.tracks).toEqual([track('s1', true)]);
    expect(result.albums).toBe(empty.albums);
  });

  it('routes albums and artists to their own collections', () => {
    expect(addToStarred(empty, { kind: 'album', item: album('a1') }).albums).toHaveLength(1);
    expect(addToStarred(empty, { kind: 'artist', item: artist('ar1') }).artists).toHaveLength(1);
  });

  it('is idempotent — re-starring an item already present does not duplicate it', () => {
    const seeded: StarredCollections = { ...empty, tracks: [track('s1', true)] };
    expect(addToStarred(seeded, { kind: 'song', item: track('s1') })).toBe(seeded);
  });
});

describe('removeFromStarred', () => {
  it('removes an item by id from the matching collection', () => {
    const seeded: StarredCollections = {
      artists: [artist('ar1', true)],
      albums: [album('a1', true)],
      tracks: [track('s1', true), track('s2', true)],
    };
    expect(removeFromStarred(seeded, 'song', 's1').tracks.map((t) => t.id)).toEqual(['s2']);
    expect(removeFromStarred(seeded, 'album', 'a1').albums).toHaveLength(0);
    expect(removeFromStarred(seeded, 'artist', 'ar1').artists).toHaveLength(0);
  });

  it('leaves the collection untouched when the id is absent', () => {
    const seeded: StarredCollections = { ...empty, tracks: [track('s1', true)] };
    expect(removeFromStarred(seeded, 'song', 'missing').tracks).toHaveLength(1);
  });
});
