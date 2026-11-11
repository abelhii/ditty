import { levellingGain } from '@/player/replay-gain';

describe('levellingGain', () => {
  it('is 1 when levelling is off', () => {
    expect(levellingGain({ trackGain: -6 }, 'off')).toBe(1);
  });

  it('is 1 when the track has no ReplayGain data', () => {
    expect(levellingGain(undefined, 'track')).toBe(1);
    expect(levellingGain({}, 'album')).toBe(1);
  });

  it('attenuates by the track gain in dB', () => {
    expect(levellingGain({ trackGain: -6 }, 'track')).toBeCloseTo(0.501, 3);
  });

  it('uses the album gain in album mode and the track gain in track mode', () => {
    const rg = { trackGain: -6, albumGain: -12 };
    expect(levellingGain(rg, 'album')).toBeCloseTo(0.251, 3);
    expect(levellingGain(rg, 'track')).toBeCloseTo(0.501, 3);
  });

  it('falls back to the other gain when the preferred one is missing', () => {
    expect(levellingGain({ trackGain: -6 }, 'album')).toBeCloseTo(0.501, 3);
    expect(levellingGain({ albumGain: -6 }, 'track')).toBeCloseTo(0.501, 3);
  });

  it('never boosts above 1', () => {
    expect(levellingGain({ trackGain: 5 }, 'track')).toBe(1);
  });

  it('is limited by the peak', () => {
    // Peak 2.0 (clipped source) caps the multiplier at 0.5 even for a -1 dB gain.
    expect(levellingGain({ trackGain: -1, trackPeak: 2 }, 'track')).toBe(0.5);
  });

  it('ignores a non-finite gain', () => {
    expect(levellingGain({ trackGain: Number.NaN }, 'track')).toBe(1);
  });
});
