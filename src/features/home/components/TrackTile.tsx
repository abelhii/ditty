import { Pressable, StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { Radius, Spacing } from '@/constants/theme';

type TrackTileProps = {
  track: Track;
  coverArtUri?: string;
  /** Width of the tile — the cover art renders as a square of this size. */
  width: number;
  /** Second subtitle line, e.g. "12 plays". */
  detail?: string;
  onPress: () => void;
  onLongPress?: () => void;
};

/** A song as a carousel tile: cover art over title and artist. Tap plays; long-press opens actions. */
export function TrackTile({ track, coverArtUri, width, detail, onPress, onLongPress }: TrackTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}>
      <CoverArtImage uri={coverArtUri} style={[styles.cover, { width, height: width }]} iconSize={32} />
      <ThemedText type="small" numberOfLines={1}>
        {track.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {track.artist}
      </ThemedText>
      {detail && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {detail}
        </ThemedText>
      )}
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
