import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { Colors } from '@/constants/theme';

// Static-export root document (web only). Raw hrefs here are not rewritten for `experiments.baseUrl`
// the way Expo's own injected asset links are, so prefix them explicitly.
const base = process.env.EXPO_BASE_URL ?? '';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* OS-scheme defaults for first paint; syncWebThemeChrome() applies the app's own choice. The
            manifest's theme_color (public/manifest.webmanifest) can't vary, so it stays light. */}
        <meta name="theme-color" content={Colors.light.background} media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content={Colors.dark.background} media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <style
          dangerouslySetInnerHTML={{
            __html: `html{background-color:${Colors.light.background}}@media (prefers-color-scheme: dark){html{background-color:${Colors.dark.background}}}`,
          }}
        />
        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${base}/icons/apple-touch-icon.png`} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
