/** Credentials needed to sign a Subsonic REST request. Never includes the plaintext password. */
export type SubsonicAuth = {
  username: string;
  token: string;
  salt: string;
};

export type SubsonicResponseStatus = 'ok' | 'failed';

export type SubsonicEnvelope<T = Record<string, never>> = {
  'subsonic-response': {
    status: SubsonicResponseStatus;
    version: string;
    type?: string;
    serverVersion?: string;
    error?: {
      code: number;
      message: string;
    };
  } & T;
};

/** A song, as returned inline within getAlbum/getStarred2/search3/etc. Subsonic calls this a "Child". */
export type SubsonicSong = {
  id: string;
  title: string;
  album?: string;
  artist?: string;
  albumId?: string;
  artistId?: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  duration?: number;
};

export type SubsonicArtist = {
  id: string;
  name: string;
  coverArt?: string;
  albumCount?: number;
  artistImageUrl?: string;
};

/** The shape returned by getArtist — an artist plus its albums. */
export type SubsonicArtistWithAlbums = SubsonicArtist & {
  album?: SubsonicAlbum[];
};

export type SubsonicAlbum = {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  year?: number;
  genre?: string;
};

/** The shape returned by getAlbum — an album plus its songs. */
export type SubsonicAlbumWithSongs = SubsonicAlbum & {
  song?: SubsonicSong[];
};

export type SubsonicIndex = {
  name: string;
  artist?: SubsonicArtist[];
};

export type SubsonicGenre = {
  value: string;
  songCount: number;
  albumCount: number;
};

export type SubsonicPlaylist = {
  id: string;
  name: string;
  owner?: string;
  public?: boolean;
  songCount: number;
  duration: number;
  created?: string;
  changed?: string;
  coverArt?: string;
};

export type GetArtistsResponse = {
  artists: {
    ignoredArticles?: string;
    index?: SubsonicIndex[];
  };
};

export type GetArtistResponse = {
  artist: SubsonicArtistWithAlbums;
};

export type GetAlbumResponse = {
  album: SubsonicAlbumWithSongs;
};

export type GetGenresResponse = {
  genres: {
    genre?: SubsonicGenre[];
  };
};

export type GetPlaylistsResponse = {
  playlists: {
    playlist?: SubsonicPlaylist[];
  };
};

export type GetStarred2Response = {
  starred2: {
    artist?: SubsonicArtist[];
    album?: SubsonicAlbum[];
    song?: SubsonicSong[];
  };
};
