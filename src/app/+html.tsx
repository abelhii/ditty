import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

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
        {/* Keep in sync with Colors.light.background and public/manifest.webmanifest. */}
        <meta name="theme-color" content="#f3f2ee" />
        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${base}/icons/apple-touch-icon.png`} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
