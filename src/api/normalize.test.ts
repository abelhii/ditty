import {
  flattenArtistIndex,
  groupArtistIndex,
  normalizeAlbum,
  normalizeArtist,
  normalizeGenre,
  normalizeLyrics,
  normalizePlaylist,
  normalizeTrack,
} from '@/api/normalize';

describe('normalizeArtist', () => {
  it('maps all fields', () => {
    expect(
      normalizeArtist({ id: 'ar1', name: 'CARNÚN', coverArt: 'ar-1', albumCount: 3 }),
    ).toEqual({ id: 'ar1', name: 'CARNÚN', albumCount: 3, coverArtId: 'ar-1', starred: false });
  });

  it('defaults albumCount to 0 when missing', () => {
    expect(normalizeArtist({ id: 'ar1', name: 'CARNÚN' }).albumCount).toBe(0);
  });

  it('marks starred when the raw payload carries a starred timestamp', () => {
    expect(normalizeArtist({ id: 'ar1', name: 'CARNÚN', starred: '2026-07-29T00:00:00Z' }).starred).toBe(true);
    expect(normalizeArtist({ id: 'ar1', name: 'CARNÚN' }).starred).toBe(false);
  });
});

describe('flattenArtistIndex', () => {
  it('flattens alphabetical index groups into one array', () => {
    const index = [
      { name: 'A', artist: [{ id: 'ar1', name: 'ABBA' }] },
      { name: 'C', artist: [{ id: 'ar2', name: 'CARNÚN' }, { id: 'ar3', name: 'Cher' }] },
    ];
    expect(flattenArtistIndex(index).map((a) => a.id)).toEqual(['ar1', 'ar2', 'ar3']);
  });

  it('handles a group with no artists', () => {
    expect(flattenArtistIndex([{ name: 'Z' }])).toEqual([]);
  });

  it('handles an empty index', () => {
    expect(flattenArtistIndex([])).toEqual([]);
  });
});

describe('groupArtistIndex', () => {
  it('preserves the server-provided alphabetical grouping', () => {
    const index = [
      { name: 'A', artist: [{ id: 'ar1', name: 'ABBA' }] },
      { name: 'C', artist: [{ id: 'ar2', name: 'CARNÚN' }, { id: 'ar3', name: 'Cher' }] },
    ];
    expect(groupArtistIndex(index)).toEqual([
      { letter: 'A', artists: [{ id: 'ar1', name: 'ABBA', albumCount: 0, coverArtId: undefined, starred: false }] },
      {
        letter: 'C',
        artists: [
          { id: 'ar2', name: 'CARNÚN', albumCount: 0, coverArtId: undefined, starred: false },
          { id: 'ar3', name: 'Cher', albumCount: 0, coverArtId: undefined, starred: false },
        ],
      },
    ]);
  });

  it('keeps a group with no artists as an empty section rather than dropping it', () => {
    expect(groupArtistIndex([{ name: 'Z' }])).toEqual([{ letter: 'Z', artists: [] }]);
  });

  it('handles an empty index', () => {
    expect(groupArtistIndex([])).toEqual([]);
  });
});

describe('normalizeAlbum', () => {
  it('maps all fields', () => {
    expect(
      normalizeAlbum({
        id: 'al1',
        name: 'Homework',
        artist: 'Daft Punk',
        artistId: 'ar1',
        coverArt: 'al-1',
        songCount: 16,
        duration: 4321,
        year: 1997,
        genre: 'Electronic',
      }),
    ).toEqual({
      id: 'al1',
      name: 'Homework',
      artist: 'Daft Punk',
      artistId: 'ar1',
      songCount: 16,
      duration: 4321,
      year: 1997,
      genre: 'Electronic',
      coverArtId: 'al-1',
      starred: false,
    });
  });

  it('defaults artist to an empty string when missing', () => {
    expect(normalizeAlbum({ id: 'al1', name: 'Homework', songCount: 16, duration: 4321 }).artist).toBe('');
  });
});

describe('normalizeTrack', () => {
  it('maps all fields', () => {
    expect(
      normalizeTrack({
        id: 's1',
        title: 'Around the World',
        album: 'Homework',
        albumId: 'al-1',
        artist: 'Daft Punk',
        coverArt: 'al-1',
        duration: 429,
        suffix: 'flac',
        bitRate: 1411,
        bitDepth: 24,
        samplingRate: 44100,
      }),
    ).toEqual({
      id: 's1',
      title: 'Around the World',
      artist: 'Daft Punk',
      album: 'Homework',
      albumId: 'al-1',
      duration: 429,
      coverArtId: 'al-1',
      suffix: 'flac',
      bitRate: 1411,
      bitDepth: 24,
      samplingRate: 44100,
      starred: false,
    });
  });

  it('carries the starred timestamp through as starredAt, and leaves it absent when not starred', () => {
    const starred = normalizeTrack({ id: 's1', title: 'T', starred: '2026-07-29T10:00:00Z' });
    expect(starred.starred).toBe(true);
    expect(starred.starredAt).toBe('2026-07-29T10:00:00Z');
    const plain = normalizeTrack({ id: 's1', title: 'T' });
    expect(plain.starred).toBe(false);
    expect(plain.starredAt).toBeUndefined();
  });

  it('carries playCount through, and leaves it absent when the server omits it', () => {
    expect(normalizeTrack({ id: 's1', title: 'T', playCount: 7 }).playCount).toBe(7);
    expect(normalizeTrack({ id: 's1', title: 'T' }).playCount).toBeUndefined();
  });

  it('defaults artist, album, and duration when missing', () => {
    expect(normalizeTrack({ id: 's1', title: 'Untitled' })).toEqual({
      id: 's1',
      title: 'Untitled',
      artist: '',
      album: '',
      duration: 0,
      coverArtId: undefined,
      suffix: undefined,
      bitRate: undefined,
      bitDepth: undefined,
      samplingRate: undefined,
      starred: false,
    });
  });

  it('passes ReplayGain tags through', () => {
    expect(
      normalizeTrack({ id: 's1', title: 'x', replayGain: { trackGain: -7.2, trackPeak: 0.98 } }).replayGain,
    ).toEqual({ trackGain: -7.2, trackPeak: 0.98 });
  });

  it('marks starred when the raw song carries a starred timestamp', () => {
    expect(normalizeTrack({ id: 's1', title: 'x', starred: '2026-07-29T00:00:00Z' }).starred).toBe(true);
  });
});

describe('normalizeGenre', () => {
  it('maps value to name', () => {
    expect(normalizeGenre({ value: 'Punk', songCount: 1, albumCount: 1 })).toEqual({
      name: 'Punk',
      songCount: 1,
      albumCount: 1,
    });
  });
});

describe('normalizePlaylist', () => {
  it('maps public to isPublic', () => {
    expect(
      normalizePlaylist({
        id: 'pl1',
        name: 'Random',
        owner: 'admin',
        public: false,
        songCount: 43,
        duration: 17875,
      }),
    ).toEqual({
      id: 'pl1',
      name: 'Random',
      owner: 'admin',
      isPublic: false,
      songCount: 43,
      duration: 17875,
      coverArtId: undefined,
    });
  });

  it('defaults isPublic to false when missing', () => {
    expect(normalizePlaylist({ id: 'pl1', name: 'Random', songCount: 0, duration: 0 }).isPublic).toBe(false);
  });
});

describe('normalizeLyrics', () => {
  it('normalizes unsynced lyrics without timing', () => {
    expect(normalizeLyrics([{ synced: false, line: [{ value: 'a' }, { value: 'b' }] }])).toEqual({
      synced: false,
      offsetMs: 0,
      lines: [{ text: 'a' }, { text: 'b' }],
    });
  });

  it('keeps start times and the offset for synced lyrics', () => {
    expect(
      normalizeLyrics([{ synced: true, offset: 250, line: [{ start: 0, value: 'a' }, { start: 900, value: 'b' }] }]),
    ).toEqual({
      synced: true,
      offsetMs: 250,
      lines: [
        { text: 'a', startMs: 0 },
        { text: 'b', startMs: 900 },
      ],
    });
  });

  it('returns null for undefined, empty, or all-blank lyrics', () => {
    expect(normalizeLyrics(undefined)).toBeNull();
    expect(normalizeLyrics([])).toBeNull();
    expect(normalizeLyrics([{ synced: true, line: [] }])).toBeNull();
    expect(normalizeLyrics([{ synced: false, line: [{ value: '  ' }, {}] }])).toBeNull();
    expect(normalizeLyrics([{ synced: false }])).toBeNull();
  });

  it('prefers synced lyrics over an earlier unsynced set', () => {
    const result = normalizeLyrics([
      { synced: false, line: [{ value: 'plain' }] },
      { synced: true, line: [{ start: 0, value: 'timed' }] },
    ]);
    expect(result?.synced).toBe(true);
    expect(result?.lines[0].text).toBe('timed');
  });

  it('falls back to plain text when a synced set has a line without a start', () => {
    const result = normalizeLyrics([{ synced: true, offset: 100, line: [{ start: 0, value: 'a' }, { value: 'b' }] }]);
    expect(result).toEqual({ synced: false, offsetMs: 0, lines: [{ text: 'a' }, { text: 'b' }] });
  });

  it('keeps blank lines as gaps and defaults a missing value to empty', () => {
    const result = normalizeLyrics([{ synced: false, line: [{ value: 'a' }, { value: '' }, {}, { value: 'b' }] }]);
    expect(result?.lines.map((line) => line.text)).toEqual(['a', '', '', 'b']);
  });
});
