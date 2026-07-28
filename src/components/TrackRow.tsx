import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const THUMBNAIL_SIZE = 40;

type TrackRowProps = {
  track: Track;
  /** 1-based track position, shown in the leading slot — for an ordered list like album detail.
   *  Omit it (e.g. in search results, where songs aren't part of one album) to show the track's
   *  cover art thumbnail instead. */
  position?: number;
  /** Cover art URL, used for the leading thumbnail when `position` is omitted. */
  coverArtUri?: string;
  isPlaying?: boolean;
  onPress: () => void;
  onOverflowPress: () => void;
};

export function TrackRow({
  track,
  position,
  coverArtUri,
  isPlaying = false,
  onPress,
  onOverflowPress,
}: TrackRowProps) {
  const theme = useTheme();

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      {position !== undefined ? (
        <ThemedText
          type="small"
          themeColor={isPlaying ? 'text' : 'textSecondary'}
          style={styles.position}>
          {position}
        </ThemedText>
      ) : (
        <CoverArtImage uri={coverArtUri} style={styles.thumbnail} />
      )}
      <ThemedView style={styles.text}>
        <ThemedText numberOfLines={1} themeColor={isPlaying ? 'text' : undefined}>
          {track.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {track.artist}
        </ThemedText>
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDuration(track.duration)}
      </ThemedText>
      <Pressable hitSlop={12} onPress={onOverflowPress} style={styles.overflow}>
        <SymbolView
          name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
          size={18}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
  position: {
    width: Spacing.four,
    textAlign: 'center',
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Spacing.one,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  overflow: {
    padding: Spacing.one,
  },
});
