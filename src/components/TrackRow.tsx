import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Track } from '@/api/types';
import { CoverArtImage } from '@/components/CoverArtImage';
import { PlayingIndicator } from '@/components/PlayingIndicator';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import { DownloadBadge } from '@/features/downloads/components/DownloadBadge';
import { useTrackDownloadState } from '@/features/downloads/hooks/use-download-state';
import { useOfflineMode } from '@/features/downloads/use-offline-store';
import { useTheme } from '@/hooks/use-theme';
import { useIsCurrentTrack } from '@/player/hooks/use-is-current-track';

const THUMBNAIL_SIZE = 40;

type TrackRowProps = {
  track: Track;
  /** 1-based track position, shown in the leading slot — for an ordered list like album detail.
   *  Omit it (e.g. in search results, where songs aren't part of one album) to show the track's
   *  cover art thumbnail instead. */
  position?: number;
  /** Cover art URL, used for the leading thumbnail when `position` is omitted. */
  coverArtUri?: string;
  onPress: () => void;
  onOverflowPress: () => void;
};

export function TrackRow({
  track,
  position,
  coverArtUri,
  onPress,
  onOverflowPress,
}: TrackRowProps) {
  const theme = useTheme();
  const isPlaying = useIsCurrentTrack(track.id);
  // Offline, only downloaded tracks can play — grey the rest out and make them inert.
  const offline = useOfflineMode();
  const downloadState = useTrackDownloadState(track.id);
  const unavailable = offline && downloadState.kind !== 'downloaded';

  return (
    <Pressable
      disabled={unavailable}
      accessibilityState={{ disabled: unavailable }}
      style={(state) => [
        styles.row,
        unavailable && styles.unavailable,
        // Pressed beats hover beats playing. `hovered` is only set by react-native-web.
        isPlaying && { backgroundColor: theme.rowPlaying },
        (state as { hovered?: boolean }).hovered && { backgroundColor: theme.rowHover },
        state.pressed && { backgroundColor: theme.rowPressed },
      ]}
      onPress={onPress}>
      {isPlaying ? (
        <View style={position !== undefined ? styles.position : styles.thumbnailSlot}>
          <PlayingIndicator />
        </View>
      ) : position !== undefined ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.position}>
          {position}
        </ThemedText>
      ) : (
        <CoverArtImage uri={coverArtUri} style={styles.thumbnail} />
      )}
      <ThemedView style={styles.text}>
        <ThemedText type="defaultBold" numberOfLines={1} themeColor={isPlaying ? 'accent' : undefined}>
          {track.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {track.artist}
        </ThemedText>
      </ThemedView>
      <DownloadBadge trackId={track.id} />
      <ThemedText type="small" themeColor="textSecondary">
        {formatDuration(track.duration)}
      </ThemedText>
      <Pressable
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${track.title}`}
        onPress={onOverflowPress}
        style={styles.overflow}>
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
  unavailable: {
    opacity: 0.4,
  },
  position: {
    width: Spacing.four,
    alignItems: 'center',
    textAlign: 'center',
  },
  thumbnailSlot: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
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
  overflow: {
    padding: Spacing.one,
  },
});
