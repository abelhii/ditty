import type { Track } from '@/api/types';
import type { DownloadRecord } from '@/features/downloads/download-rows';
import { albumFromDownloads } from '@/features/downloads/offline-album';

function rec(id: string, extra: Partial<Track> = {}, state: DownloadRecord['state'] = 'complete'): DownloadRecord {
  return {
    track: { id, title: id, artist: 'Band', album: 'Record', albumId: 'al1', duration: 100, starred: false, ...extra },
    filePath: `file:///${id}`,
    coverPath: null,
    sizeBytes: 1,
    state,
  };
}

describe('albumFromDownloads', () => {
  it('builds a partial album from the downloaded tracks that belong to it', () => {
    const result = albumFromDownloads('al1', [
      rec('a', { coverArtId: 'c1', genre: 'Rock' }),
      rec('b'),
      rec('x', { albumId: 'other' }),
    ]);
    expect(result?.tracks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(result?.album).toMatchObject({
      id: 'al1',
      name: 'Record',
      artist: 'Band',
      songCount: 2,
      duration: 200,
      coverArtId: 'c1',
      genre: 'Rock',
      starred: false,
    });
  });

  it('is null when nothing downloaded belongs to the album', () => {
    expect(albumFromDownloads('nope', [rec('a')])).toBeNull();
    expect(albumFromDownloads('al1', [])).toBeNull();
  });

  it('ignores partial downloads', () => {
    expect(albumFromDownloads('al1', [rec('a', {}, 'partial')])).toBeNull();
  });
});
