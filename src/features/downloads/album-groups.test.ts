import type { Track } from '@/api/types';
import { groupByAlbum } from '@/features/downloads/album-groups';
import type { DownloadRecord } from '@/features/downloads/download-rows';

function rec(id: string, extra: Partial<Track>, sizeBytes = 10, state: DownloadRecord['state'] = 'complete'): DownloadRecord {
  return {
    track: { id, title: id, artist: 'Band', album: 'Record', duration: 1, starred: false, ...extra },
    filePath: `file:///${id}`,
    coverPath: null,
    sizeBytes,
    state,
  };
}

describe('groupByAlbum', () => {
  it('groups tracks by album id and sums size', () => {
    const groups = groupByAlbum([
      rec('a', { albumId: 'al1' }, 5),
      rec('b', { albumId: 'al1' }, 7),
      rec('c', { albumId: 'al2', album: 'Alpha' }, 1),
    ]);
    expect(groups.map((g) => [g.albumName, g.trackIds, g.sizeBytes])).toEqual([
      ['Alpha', ['c'], 1],
      ['Record', ['a', 'b'], 12],
    ]);
  });

  it('falls back to the album name when there is no album id', () => {
    const groups = groupByAlbum([rec('a', {}), rec('b', {})]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('Record');
  });

  it('skips partial downloads and handles empty input', () => {
    expect(groupByAlbum([rec('a', {}, 1, 'partial')])).toEqual([]);
    expect(groupByAlbum([])).toEqual([]);
  });
});
