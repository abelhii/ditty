import type { Album, Artist, Genre, Playlist } from '@/api/types';

/** One line of the wide Library table, whatever it lists. */
/** Links stay inside the stacks the web shell registers: My Music routes are not reachable there
 *  (see src/app/home/_layout.tsx), so playlists and Liked Songs open under Home and the rest under
 *  Library. */
export type LibraryRow = {
  key: string;
  title: string;
  /** Second line under the title (the artist for an album, say). */
  subtitle?: string;
  coverArtId?: string;
  /** Marks the pinned Liked Songs row, which has a heart tile instead of cover art. */
  liked?: boolean;
  typeLabel: string;
  songCount?: number;
  /** Already formatted for display; undefined shows a dash. */
  added?: string;
  /** Raw ISO timestamp behind `added`, for sorting. */
  createdAt?: string;
  href: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", "N days ago" within a month, then a short date. Undefined for a missing
 *  or unparseable timestamp, and for one in the future. */
export function formatAddedDate(iso: string | undefined, now: Date): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() > now.getTime()) return undefined;

  const days = Math.floor((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function likedSongsRow(songCount: number | undefined): LibraryRow {
  return {
    key: 'liked',
    title: 'Liked Songs',
    liked: true,
    typeLabel: 'Collection',
    songCount,
    href: '/home/liked-songs',
  };
}

export function playlistRows(playlists: Playlist[], now: Date): LibraryRow[] {
  return playlists.map((playlist) => ({
    key: playlist.id,
    title: playlist.name,
    coverArtId: playlist.coverArtId,
    typeLabel: 'Playlist',
    songCount: playlist.songCount,
    added: formatAddedDate(playlist.created, now),
    createdAt: playlist.created,
    href: `/home/playlist/${playlist.id}`,
  }));
}

export function albumRows(albums: Album[]): LibraryRow[] {
  return albums.map((album) => ({
    key: album.id,
    title: album.name,
    subtitle: album.artist,
    coverArtId: album.coverArtId,
    typeLabel: 'Album',
    songCount: album.songCount,
    href: `/library/album/${album.id}`,
  }));
}

export function artistRows(artists: Artist[]): LibraryRow[] {
  return artists.map((artist) => ({
    key: artist.id,
    title: artist.name,
    subtitle: `${artist.albumCount} ${artist.albumCount === 1 ? 'album' : 'albums'}`,
    coverArtId: artist.coverArtId,
    typeLabel: 'Artist',
    href: `/library/artist/${artist.id}`,
  }));
}

export function genreRows(genres: Genre[]): LibraryRow[] {
  return genres.map((genre) => ({
    key: genre.name,
    title: genre.name,
    subtitle: `${genre.albumCount} ${genre.albumCount === 1 ? 'album' : 'albums'}`,
    typeLabel: 'Genre',
    songCount: genre.songCount,
    href: `/library/genre/${encodeURIComponent(genre.name)}`,
  }));
}
