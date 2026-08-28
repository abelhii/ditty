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
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
