import { Pressable, StyleSheet } from 'react-native';

import type { Album } from '@/api/types';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { Radius, Spacing } from '@/constants/theme';

type AlbumTileProps = {
  album: Album;
  coverArtUri?: string;
  /** Width of the tile — the cover art renders as a square of this size. */
  width: number;
  onPress: () => void;
  /** Draws the cover as a circle (the first tile of the wide Home's Recently added row). */
  round?: boolean;
};

export function AlbumTile({ album, coverArtUri, width, onPress, round }: AlbumTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
      onPress={onPress}>
      <CoverArtImage uri={coverArtUri} style={[styles.cover, { width, height: width }, round && { borderRadius: Radius.pill }]} iconSize={32} />
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
    borderRadius: Radius.sm,
    marginBottom: Spacing.one,
  },
});
