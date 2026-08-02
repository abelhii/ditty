import type { Track } from '@/api/types';

import { formatTrackAudioLabel } from '@/features/player/trackAudioLabel';

const base: Track = {
  id: 's1',
  title: 'x',
  artist: 'a',
  album: 'al',
  duration: 1,
  starred: false,
};

describe('formatTrackAudioLabel', () => {
  it('joins every reported part with a middot', () => {
    expect(
      formatTrackAudioLabel({ ...base, suffix: 'flac', bitDepth: 24, samplingRate: 44100, bitRate: 1411 }),
    ).toBe('FLAC · 24-bit · 44.1 kHz · 1411 kbps');
  });

  it('upper-cases the file type and drops a trailing .0 on whole-kHz rates', () => {
    expect(formatTrackAudioLabel({ ...base, suffix: 'mp3', samplingRate: 48000, bitRate: 320 })).toBe(
      'MP3 · 48 kHz · 320 kbps',
    );
  });

  it('omits parts the server did not report', () => {
    expect(formatTrackAudioLabel({ ...base, suffix: 'mp3', bitRate: 320 })).toBe('MP3 · 320 kbps');
  });

  it('returns an empty string when nothing is known', () => {
    expect(formatTrackAudioLabel(base)).toBe('');
  });
});
