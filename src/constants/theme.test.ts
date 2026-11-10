import {
  BottomTabInset,
  isWideWidth,
  ListBottomInset,
  MiniPlayerHeight,
  MiniPlayerOffset,
  Spacing,
  WideLayoutMinWidth,
} from '@/constants/theme';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));

describe('ListBottomInset', () => {
  it('clears the floating mini player with a gap to spare', () => {
    // The mini player's top edge, measured up from the bottom safe-area inset.
    const miniPlayerTop = BottomTabInset + MiniPlayerOffset + MiniPlayerHeight;
    expect(ListBottomInset - miniPlayerTop).toBeGreaterThanOrEqual(Spacing.three);
  });
});

describe('isWideWidth', () => {
  it('switches to the wide layout at exactly the breakpoint', () => {
    expect(isWideWidth(WideLayoutMinWidth - 1)).toBe(false);
    expect(isWideWidth(WideLayoutMinWidth)).toBe(true);
  });

  it('uses 900 as the breakpoint', () => {
    expect(isWideWidth(899)).toBe(false);
    expect(isWideWidth(900)).toBe(true);
  });
});
