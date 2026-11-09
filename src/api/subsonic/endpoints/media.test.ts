import { Platform } from 'react-native';

import { getStreamUrl } from '@/api/subsonic/endpoints/media';

const auth = { username: 'alice', token: 'abc123', salt: 'xyz789' };

describe('getStreamUrl', () => {
  it('signs a raw stream request keyed by track id', () => {
    const url = new URL(getStreamUrl('https://navidrome.example.com', 'track-1', auth));
    expect(url.origin + url.pathname).toBe('https://navidrome.example.com/rest/stream.view');
    expect(url.searchParams.get('id')).toBe('track-1');
    expect(url.searchParams.get('u')).toBe('alice');
  });

  // expo-audio's ExoPlayer/AVFoundation backends decode FLAC natively, so we stream the original
  // bytes bit-perfect and no longer transcode to MP3 — superseding the old 24-bit workaround
  // (docs/adr/0008). Assert no transcode params leak onto the URL, on native or web.
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
