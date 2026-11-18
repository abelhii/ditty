import { Colors } from '@/constants/theme';

/**
 * Pushes the resolved app scheme to the browser/PWA chrome: `<meta name="theme-color">` (title bar /
 * status bar), `color-scheme` and the root background (overscroll, safe areas). +html.tsx only knows
 * the OS scheme, so this overrides it once the user's explicit Light/Dark choice is known.
 */
export function syncWebThemeChrome(scheme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const color = Colors[scheme].background;

  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  const meta = metas[0] ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
  metas.forEach((extra, index) => index > 0 && extra.remove());
  meta.removeAttribute('media');
  meta.content = color;

  document.documentElement.style.colorScheme = scheme;
  document.documentElement.style.backgroundColor = color;
}
