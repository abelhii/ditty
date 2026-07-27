import { Image, type ImageStyle } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import type { StyleProp } from 'react-native';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

type CoverArtImageProps = {
  /** A pre-signed cover art URL, already sized via `getCoverArtUrl`
   *  (see docs/adr/0003-cover-art-sizing-and-caching.md) — or undefined for "no cover art". */
  uri?: string;
  /** Layout for the image/placeholder box — callers control on-screen size, this component only
   *  renders within it. */
  style: StyleProp<ImageStyle>;
  /** Size of the placeholder icon shown when there's no `uri`. */
  iconSize?: number;
};

/** Cover art at a fixed pre-signed URL, or a placeholder — purely declarative, no network/store
 *  access (the caller resolves `uri` via `getCoverArtUrl` and passes it down). */
export function CoverArtImage({ uri, style, iconSize = 20 }: CoverArtImageProps) {
  const theme = useTheme();

  if (!uri) {
    return (
      <ThemedView type="backgroundElement" style={[styles.placeholder, style]}>
        <SymbolView
          name={{ ios: 'music.note', android: 'music_note', web: 'music_note' }}
          size={iconSize}
          tintColor={theme.textSecondary}
        />
      </ThemedView>
    );
  }

  return <Image source={{ uri }} style={style} transition={150} />;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
