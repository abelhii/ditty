import { BottomTabInset, ListBottomInset, MiniPlayerHeight, MiniPlayerOffset, Spacing } from '@/constants/theme';

// theme.ts imports the web stylesheet for its side effect; jest can't parse CSS.
jest.mock('@/global.css', () => ({}));

describe('ListBottomInset', () => {
  it('clears the floating mini player with a gap to spare', () => {
    // The mini player's top edge, measured up from the bottom safe-area inset.
    const miniPlayerTop = BottomTabInset + MiniPlayerOffset + MiniPlayerHeight;
    expect(ListBottomInset - miniPlayerTop).toBeGreaterThanOrEqual(Spacing.three);
  });
});
