import type { Album, Artist, ArtistSection, Genre, Lyrics, Playlist, Track } from '@/api/types';
import type {
  SubsonicAlbum,
  SubsonicArtist,
  SubsonicGenre,
  SubsonicIndex,
  SubsonicPlaylist,
  SubsonicSong,
  SubsonicStructuredLyrics,
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
    created: raw.created,
  };
}

export function normalizeTrack(raw: SubsonicSong): Track {
  return {
    id: raw.id,
    title: raw.title,
    artist: raw.artist ?? '',
    album: raw.album ?? '',
    albumId: raw.albumId,
    artistId: raw.artistId,
    genre: raw.genre,
    duration: raw.duration ?? 0,
    coverArtId: raw.coverArt,
    suffix: raw.suffix,
    bitRate: raw.bitRate,
    bitDepth: raw.bitDepth,
    samplingRate: raw.samplingRate,
    replayGain: raw.replayGain,
    starred: raw.starred != null,
    starredAt: raw.starred,
    playCount: raw.playCount,
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
    created: raw.created,
  };
}

/**
 * Picks the lyrics to show from a song's `structuredLyrics` and normalizes them, or returns null
 * when there is nothing to show. Prefers synced lyrics, then the server's own order (so the first
 * language wins). Lyrics count as synced only when every line has a start time; a half-timed set
 * can't be followed, so it is shown as plain text. A set whose lines are all blank is skipped.
 */
export function normalizeLyrics(list: SubsonicStructuredLyrics[] | undefined): Lyrics | null {
  const usable = (list ?? []).filter((entry) => (entry.line ?? []).some((line) => line.value?.trim()));
  const entry = usable.find((candidate) => candidate.synced) ?? usable[0];
  if (!entry) return null;

  const rawLines = entry.line ?? [];
  const synced =
    entry.synced === true && rawLines.every((line) => typeof line.start === 'number' && Number.isFinite(line.start));
  const lines = rawLines.map((line) => ({
    text: line.value ?? '',
    ...(synced ? { startMs: line.start } : {}),
  }));

  return { synced, offsetMs: synced && Number.isFinite(entry.offset) ? (entry.offset as number) : 0, lines };
}
