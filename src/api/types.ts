/** A single playable audio item — the unit both the Library and the Queue operate on.
 *  See CONTEXT.md for the canonical definition. */
export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
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
