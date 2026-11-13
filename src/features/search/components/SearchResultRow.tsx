import { Pressable, StyleSheet } from 'react-native';

import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';

const THUMBNAIL_SIZE = 48;

type SearchResultRowProps = {
  title: string;
  /** Type-stating subtitle, e.g. "Album · Radiohead". */
  subtitle: string;
  coverArtUri?: string;
  /** Circular thumbnail, for Artists. */
  round?: boolean;
  onPress: () => void;
};

/** A tappable cover + title + type-label row for the mixed All list (Artist / Album / Playlist). */
export function SearchResultRow({ title, subtitle, coverArtUri, round, onPress }: SearchResultRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}>
      <CoverArtImage
        uri={coverArtUri}
        style={[styles.thumbnail, round && { borderRadius: THUMBNAIL_SIZE / 2 }]}
      />
      <ThemedView style={styles.text}>
        <ThemedText type="defaultBold" numberOfLines={1}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {subtitle}
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
    borderRadius: Radius.sm,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
