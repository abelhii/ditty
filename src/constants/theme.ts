/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Warm-stone palette from the "High-Fidelity Mockups v4" design. The mockup is light-only, so
 * `dark` keeps the app's earlier dark values; its `accent`/`accentDeep`/`tint`/`shadow`/`border`
 * entries are an unverified fallback, not a designed dark palette.
 */
export const Colors = {
  light: {
    text: '#22201c',
    background: '#f3f2ee',
    backgroundElement: '#e9e5de',
    backgroundSelected: '#dbd6cd',
    textSecondary: '#787268',
    /** Sage brand accent — active pills/chips, progress fill, primary buttons. */
    accent: '#5f7340',
    /** Pressed/hover state of `accent`. */
    accentDeep: '#3c4a29',
    /** Elevated surface above `background` (e.g. the floating mini-player bar). */
    tint: '#faf8f5',
    /** Drop-shadow tint for elevated surfaces (e.g. the floating mini-player bar). */
    shadow: '#2e2b25',
    /** Hairline outlines and dividers (e.g. inactive filter chips). */
    border: '#d1d0cc',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#5f7340',
    accentDeep: '#3c4a29',
    tint: '#212225',
    shadow: '#000000',
    border: '#2E3135',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** The full player's fixed dark surface (NowPlayingScreen + Scrubber) — deliberately independent
 *  of the light/dark scheme, since the v4 mockup has only one, dark, full-player design (the other
 *  five screens are light-only). Not part of `Colors` because it never swaps with the scheme. */
export const PlayerSurface = {
  background: '#22201c',
  text: '#f3f2ee',
  textSecondary: 'rgba(243,242,238,.65)',
  textMuted: 'rgba(243,242,238,.55)',
  trackBackground: 'rgba(243,242,238,.25)',
} as const;

/** Radius scale from the v4 mockup: pill controls (and circles), cards, thumbnails. */
export const Radius = {
  pill: 999,
  md: 16,
  sm: 10,
} as const;

/** Soft drop shadow for surfaces floating above content (the mini-player bar). Pair with
 *  `shadowColor: theme.shadow`. */
export const Shadow = {
  floating: {
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

/** Thickness of the playback progress bars (mini player, full-player scrubber). */
export const ProgressBarHeight = 5;

/** Type ramp from the v4 mockup (font size / line height), used by `ThemedText`. Mockup sizes are
 *  scaled 1.3x so its 300 pt phone artboard fills a ~390 pt phone. Other sizes taken from the mockup
 *  (radii, progress bar, player and tile sizes) use the same factor. */
export const TypeScale = {
  title: { fontSize: 26, lineHeight: 34 },
  subtitle: { fontSize: 28, lineHeight: 36 },
  default: { fontSize: 18, lineHeight: 26 },
  small: { fontSize: 16, lineHeight: 21 },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** Figtree Regular (400) — v4 mockup body text. */
    sans: 'Figtree_400Regular',
    /** Figtree Bold (700) — v4 mockup headings. */
    sansBold: 'Figtree_700Bold',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Figtree_400Regular',
    sansBold: 'Figtree_700Bold',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Figtree_400Regular',
    sansBold: 'Figtree_700Bold',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Kept as-is for the v4 restyle: the mockup's own spacing (4.4/8.8/13.2/17.6/26.4/35.2) doesn't
 *  map cleanly onto this scale, so screens use the nearest step here rather than a second scale. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Web's narrow-width bottom tab bar height (AppTabs.web); the wide-width top bar ignores it. */
export const WebBottomBarHeight = 64;
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: WebBottomBarHeight }) ?? 0;
export const MaxContentWidth = 800;

/** Height of the floating mini-player bar. The bar is sized to this, so screens can reserve room
 *  for it without measuring. */
export const MiniPlayerHeight = 72;
/** Gap between the tab bar (or, on web, the window's bottom edge) and the mini player. */
export const MiniPlayerOffset = Spacing.one;
/** Bottom padding for scrollable screens, added to the bottom safe-area inset: clears the tab bar
 *  and the floating mini player so the last row can scroll fully into view. */
export const ListBottomInset = BottomTabInset + MiniPlayerOffset + MiniPlayerHeight + Spacing.three;
