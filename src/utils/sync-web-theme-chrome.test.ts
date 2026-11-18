/** @jest-environment jsdom */
import { Colors } from '@/constants/theme';
jest.mock('@/global.css', () => ({}));

import { syncWebThemeChrome } from '@/utils/sync-web-theme-chrome';

beforeEach(() => {
  document.head.innerHTML =
    '<meta name="theme-color" content="#fff" media="(prefers-color-scheme: light)">' +
    '<meta name="theme-color" content="#000" media="(prefers-color-scheme: dark)">';
  document.documentElement.removeAttribute('style');
});

describe('syncWebThemeChrome', () => {
  it('collapses the media-specific theme-color tags into one for the chosen scheme', () => {
    syncWebThemeChrome('dark');
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    expect(metas).toHaveLength(1);
    expect(metas[0].getAttribute('content')).toBe(Colors.dark.background);
    expect(metas[0].hasAttribute('media')).toBe(false);
  });

  it('sets color-scheme and the root background, and switches back', () => {
    syncWebThemeChrome('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    syncWebThemeChrome('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(Colors.light.background);
  });

  it('creates the tag when none exists', () => {
    document.head.innerHTML = '';
    syncWebThemeChrome('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(Colors.light.background);
  });
});
