import type { Album, Artist, ArtistSection, Genre, Playlist, Track } from '@/api/types';
import type {
  SubsonicAlbum,
  SubsonicArtist,
  SubsonicGenre,
  SubsonicIndex,
  SubsonicPlaylist,
  SubsonicSong,
} from '@/api/subsonic/types';

export function normalizeArtist(raw: SubsonicArtist): Artist {
  return {
    id: raw.id,
    name: raw.name,
    albumCount: raw.albumCount ?? 0,
    coverArtId: raw.coverArt,
    starred: raw.starred != null,
  };
}

/** Flattens getArtists' alphabetical index groups into one array. */
export function flattenArtistIndex(index: SubsonicIndex[]): Artist[] {
  return index.flatMap((group) => (group.artist ?? []).map(normalizeArtist));
}

/** Preserves getArtists' alphabetical index groups, for a sectioned Artists screen — see
 *  the Artist screen's A-Z headers (Build Order step 5). */
export function groupArtistIndex(index: SubsonicIndex[]): ArtistSection[] {
  return index.map((group) => ({
    letter: group.name,
    artists: (group.artist ?? []).map(normalizeArtist),
  }));
}

export function normalizeAlbum(raw: SubsonicAlbum): Album {
  return {
    id: raw.id,
    name: raw.name,
    artist: raw.artist ?? '',
    artistId: raw.artistId,
    songCount: raw.songCount,
    duration: raw.duration,
    year: raw.year,
    genre: raw.genre,
    coverArtId: raw.coverArt,
    starred: raw.starred != null,
  };
}

export function normalizeTrack(raw: SubsonicSong): Track {
  return {
    id: raw.id,
    title: raw.title,
    artist: raw.artist ?? '',
    album: raw.album ?? '',
    albumId: raw.albumId,
    duration: raw.duration ?? 0,
    coverArtId: raw.coverArt,
    starred: raw.starred != null,
  };
}

export function normalizeGenre(raw: SubsonicGenre): Genre {
  return {
    name: raw.value,
    songCount: raw.songCount,
    albumCount: raw.albumCount,
  };
}

export function normalizePlaylist(raw: SubsonicPlaylist): Playlist {
  return {
    id: raw.id,
    name: raw.name,
    owner: raw.owner,
    isPublic: raw.public ?? false,
    songCount: raw.songCount,
    duration: raw.duration,
    coverArtId: raw.coverArt,
  };
}
