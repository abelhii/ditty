import { Pressable, StyleSheet } from 'react-native';

import type { Album } from '@/api/types';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';

type AlbumTileProps = {
  album: Album;
  coverArtUri?: string;
  /** Width of the tile — the cover art renders as a square of this size. */
  width: number;
  onPress: () => void;
};

export function AlbumTile({ album, coverArtUri, width, onPress }: AlbumTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
      onPress={onPress}>
      <CoverArtImage uri={coverArtUri} style={[styles.cover, { width, height: width }]} iconSize={32} />
      <ThemedText type="small" numberOfLines={1}>
        {album.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {album.artist}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  cover: {
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
});
