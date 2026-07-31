import { Pressable, StyleSheet } from 'react-native';

import type { Artist } from '@/api/types';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';

const THUMBNAIL_SIZE = 48;

type ArtistRowProps = {
  artist: Artist;
  coverArtUri?: string;
  onPress: () => void;
};

export function ArtistRow({ artist, coverArtUri, onPress }: ArtistRowProps) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <CoverArtImage uri={coverArtUri} style={styles.thumbnail} />
      <ThemedView style={styles.text}>
        <ThemedText numberOfLines={1}>{artist.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: THUMBNAIL_SIZE / 2,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
