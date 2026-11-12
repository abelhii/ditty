import { seekValueText, steppedSeek } from '@/features/player/seek-step';

describe('steppedSeek', () => {
  it('moves by delta', () => expect(steppedSeek(30, 200, 10)).toBe(40));
  it('clamps at the start', () => expect(steppedSeek(4, 200, -10)).toBe(0));
  it('clamps at the end', () => expect(steppedSeek(195, 200, 10)).toBe(200));
  it('returns null without a duration', () => {
    expect(steppedSeek(0, 0, 10)).toBeNull();
    expect(steppedSeek(0, NaN, 10)).toBeNull();
  });
});

describe('seekValueText', () => {
  it('formats position of duration', () =>
    expect(seekValueText(83, 225, (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)).toBe('1:23 of 3:45'));
});
