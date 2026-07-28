/** A single playable audio item — the unit both the Library and the Queue operate on.
 *  See CONTEXT.md for the canonical definition. */
export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** The album this track belongs to — used to start a queue from the album when a search song is
   *  tapped with no queue playing (see docs/adr/0004-search-tap-preserves-queue.md). */
  albumId?: string;
  /** Seconds. */
  duration: number;
  coverArtId?: string;
};

export type Artist = {
  id: string;
  name: string;
  albumCount: number;
  coverArtId?: string;
};

export type Album = {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  songCount: number;
  /** Seconds. */
  duration: number;
  year?: number;
  genre?: string;
  coverArtId?: string;
};

export type Genre = {
  name: string;
  songCount: number;
  albumCount: number;
};

/** One alphabetical group from getArtists, e.g. { letter: 'C', artists: [...] } — preserves the
 *  server's own grouping (including rules like ignoredArticles) rather than re-deriving it. */
export type ArtistSection = {
  letter: string;
  artists: Artist[];
};

export type Playlist = {
  id: string;
  name: string;
  owner?: string;
  isPublic: boolean;
  songCount: number;
  /** Seconds. */
  duration: number;
  coverArtId?: string;
};
