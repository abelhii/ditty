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
