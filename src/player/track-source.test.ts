import type { Track } from '@/api/types';
import type { DownloadRecord } from '@/features/downloads/download-rows';
import { resolveTrackSource } from '@/player/track-source';
import type { TrackSourceDeps } from '@/player/track-source';
import { useStreamQualityStore } from '@/player/use-stream-quality-store';

jest.mock('@/api/kv-storage', () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

const auth = { username: 'u', token: 't', salt: 's' };
const base = 'https://navidrome.example.com';
const track: Track = {
  id: 't1',
  title: 'Song',
  artist: 'A',
  album: 'B',
  duration: 100,
  starred: false,
  coverArtId: 'cov1',
};

function record(overrides: Partial<DownloadRecord> = {}): DownloadRecord {
  return {
    track,
    filePath: 'file:///d/t1.flac',
    coverPath: 'file:///d/cover-cov1.jpg',
    sizeBytes: 10,
    state: 'complete',
    ...overrides,
  };
}

function deps(
  rec: DownloadRecord | null,
  existing: string[] = ['file:///d/t1.flac', 'file:///d/cover-cov1.jpg'],
): TrackSourceDeps & { onMissingFile: jest.Mock } {
  return {
    lookup: () => rec,
    fileExists: (uri) => existing.includes(uri),
    onMissingFile: jest.fn(),
  };
}

describe('resolveTrackSource', () => {
  it('streams when there is no download', () => {
    const source = resolveTrackSource(track, base, auth, deps(null));
    expect(source.isLocal).toBe(false);
    expect(source.uri).toContain('/rest/stream.view');
    expect(source.artworkUrl).toContain('/rest/getCoverArt.view');
  });

  describe('stream quality', () => {
    afterEach(() => useStreamQualityStore.setState({ quality: 'original' }));

    it('streams the original file by default', () => {
      const url = new URL(resolveTrackSource(track, base, auth, deps(null)).uri);
      expect(url.searchParams.get('format')).toBeNull();
      expect(url.searchParams.get('maxBitRate')).toBeNull();
    });

    it('applies the chosen quality to the stream URL', () => {
      useStreamQualityStore.getState().setQuality('normal');
      const url = new URL(resolveTrackSource(track, base, auth, deps(null)).uri);
      expect(url.searchParams.get('format')).toBe('mp3');
      expect(url.searchParams.get('maxBitRate')).toBe('192');
    });

    it('leaves a downloaded track untouched', () => {
      useStreamQualityStore.getState().setQuality('low');
      expect(resolveTrackSource(track, base, auth, deps(record())).uri).toBe('file:///d/t1.flac');
    });
  });

  it('plays the local file and local cover art when a complete download exists', () => {
    const source = resolveTrackSource(track, base, auth, deps(record()));
    expect(source).toEqual({
      uri: 'file:///d/t1.flac',
      artworkUrl: 'file:///d/cover-cov1.jpg',
      isLocal: true,
    });
  });

  it('keeps remote artwork when the downloaded cover file is missing or was never saved', () => {
    const noCoverFile = resolveTrackSource(
      track, base, auth, deps(record(), ['file:///d/t1.flac']),
    );
    expect(noCoverFile.isLocal).toBe(true);
    expect(noCoverFile.artworkUrl).toContain('/rest/getCoverArt.view');

    const noCoverRow = resolveTrackSource(track, base, auth, deps(record({ coverPath: null })));
    expect(noCoverRow.artworkUrl).toContain('/rest/getCoverArt.view');
  });

  it('has no artwork at all for a track without cover art and a download without one', () => {
    const bare = { ...track, coverArtId: undefined };
    const source = resolveTrackSource(bare, base, auth, deps(record({ coverPath: null })));
    expect(source.artworkUrl).toBeUndefined();
  });

  it('falls back to streaming and reports the stale row when the audio file is gone', () => {
    const d = deps(record(), []);
    const source = resolveTrackSource(track, base, auth, d);
    expect(source.isLocal).toBe(false);
    expect(source.uri).toContain('/rest/stream.view');
    expect(d.onMissingFile).toHaveBeenCalledWith('t1');
  });

  it('ignores a partial download', () => {
    const d = deps(record({ state: 'partial' }));
    const source = resolveTrackSource(track, base, auth, d);
    expect(source.isLocal).toBe(false);
    expect(d.onMissingFile).not.toHaveBeenCalled();
  });
});
