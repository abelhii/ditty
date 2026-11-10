import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { useIsWideLayout } from '@/hooks/use-is-wide-layout';

// theme.ts imports the web stylesheet, which jest can't parse.
jest.mock('@/global.css', () => ({}));

const mockWindowWidth = { current: 1024 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth.current, height: 812, scale: 1, fontScale: 1 }),
}));

async function isWideAt(width: number, os: typeof Platform.OS) {
  mockWindowWidth.current = width;
  const original = Platform.OS;
  Platform.OS = os;
  try {
    const { result } = await renderHook(() => useIsWideLayout());
    return result.current;
  } finally {
    Platform.OS = original;
  }
}

describe('useIsWideLayout', () => {
  it('is narrow at 899 and wide at 900 on web', async () => {
    expect(await isWideAt(899, 'web')).toBe(false);
    expect(await isWideAt(900, 'web')).toBe(true);
  });

  it('is never wide on native, however wide the window', async () => {
    expect(await isWideAt(1366, 'ios')).toBe(false);
  });
});
