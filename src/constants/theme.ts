/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Warm-stone palette from "High-Fidelity Mockups v4" (Claude Design project
 * d2ae5646-f553-4cbc-8772-af147bfb237e). Dark mode has no mockup counterpart, so `dark` keeps its
 * prior values for the new keys (`accent`/`accentDeep`/`tint`) as an unverified fallback — see
 * TODO.md "Dark mode" gap.
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

/** Radius scale from the v4 mockup: pill controls, cards/dialogs, list rows, thumbnails. */
export const Radius = {
  pill: 999,
  lg: 32,
  md: 16,
  sm: 10,
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

/** Unchanged for the v4 restyle — the mockup's own scale (4.4/8.8/13.2/17.6/26.4/35.2) doesn't map
 *  cleanly onto this one, and reworking every screen's spacing wasn't worth it for a restyle pass
 *  that's otherwise just colors/radius/font. See TODO.md "Design tokens" gap. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
