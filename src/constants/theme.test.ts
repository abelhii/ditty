import { Colors, type ThemeColor } from '@/constants/theme';

jest.mock('@/global.css', () => ({}));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [ThemeColor, ThemeColor][] = [
  ['text', 'background'],
  ['textSecondary', 'background'],
  ['textSecondary', 'backgroundElement'],
  ['textSecondary', 'backgroundSelected'],
  ['danger', 'background'],
  ['danger', 'backgroundElement'],
  ['danger', 'backgroundSelected'],
  ['danger', 'tint'],
  ['onAccent', 'accent'],
  ['onAccent', 'accentDeep'],
];

describe('theme text contrast (WCAG AA, 4.5:1)', () => {
  describe.each(['light', 'dark'] as const)('%s', (scheme) => {
    it.each(PAIRS)('%s on %s', (foreground, background) => {
      expect(contrast(Colors[scheme][foreground], Colors[scheme][background])).toBeGreaterThanOrEqual(4.5);
    });
  });
});
