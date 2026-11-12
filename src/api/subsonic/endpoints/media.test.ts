import { Platform } from 'react-native';

import { CoverArtSize, coverArtSizeFor, getDownloadUrl, getStreamUrl } from '@/api/subsonic/endpoints/media';

const auth = { username: 'alice', token: 'abc123', salt: 'xyz789' };

describe('getStreamUrl', () => {
  it('signs a raw stream request keyed by track id', () => {
    const url = new URL(getStreamUrl('https://navidrome.example.com', 'track-1', auth));
    expect(url.origin + url.pathname).toBe('https://navidrome.example.com/rest/stream.view');
    expect(url.searchParams.get('id')).toBe('track-1');
    expect(url.searchParams.get('u')).toBe('alice');
  });

  // expo-audio's ExoPlayer/AVFoundation backends decode FLAC natively, so we stream the original
  // bytes bit-perfect and no longer transcode to MP3 — superseding the old 24-bit workaround.
  // Assert no transcode params leak onto the URL, on native or web.
  it.each(['ios', 'android', 'web'] as const)('never transcodes on %s', (os) => {
    const originalOS = Platform.OS;
    Platform.OS = os;
    try {
      const url = new URL(getStreamUrl('https://navidrome.example.com', 'track-1', auth));
      expect(url.searchParams.get('format')).toBeNull();
      expect(url.searchParams.get('maxBitRate')).toBeNull();
    } finally {
      Platform.OS = originalOS;
    }
  });
});

describe('getDownloadUrl', () => {
  it('signs a download request keyed by track id, with no transcode params', () => {
    const url = new URL(getDownloadUrl('https://navidrome.example.com', 'track-1', auth));
    expect(url.origin + url.pathname).toBe('https://navidrome.example.com/rest/download.view');
    expect(url.searchParams.get('id')).toBe('track-1');
    expect(url.searchParams.get('u')).toBe('alice');
    expect(url.searchParams.get('format')).toBeNull();
  });
});

describe('coverArtSizeFor', () => {
  it('uses the list size when it covers the physical pixels drawn', () => {
    expect(coverArtSizeFor(48, 3)).toBe(CoverArtSize.list);
    expect(coverArtSizeFor(150, 1)).toBe(CoverArtSize.list);
  });

  it('steps up to the grid size for a phone-width tile on a 2x screen', () => {
    // A ~151pt two-up tile on a 375pt phone draws ~303 physical pixels, more than 150.
    expect(coverArtSizeFor(151.5, 2)).toBe(CoverArtSize.grid);
    expect(coverArtSizeFor(170, 2)).toBe(CoverArtSize.grid);
  });

  it('falls back to the detail size when nothing smaller covers it', () => {
    expect(coverArtSizeFor(151.5, 3)).toBe(CoverArtSize.detail);
    expect(coverArtSizeFor(364, 2)).toBe(CoverArtSize.detail);
    expect(coverArtSizeFor(2000, 3)).toBe(CoverArtSize.detail);
  });
});
