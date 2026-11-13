import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import { useUnheardTracks } from '@/features/home/hooks/use-unheard-tracks';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';

const THUMBNAIL_SIZE = 52;

/**
 * The "Tunes you haven't heard" list: Tracks from a random sample that have never been played, or —
 * when every sampled Track has plays — a "Least played" list with play-count pills. The play button
 * queues the shown list starting at that Track. Renders nothing while loading, on error, or when
 * empty, like {@link AlbumShelf}.
 */
export function UnheardTracks() {
  const router = useRouter();
  const theme = useTheme();
  const credentials = useAuthStore((state) => state.credentials);
  const { data } = useUnheardTracks();

  if (!credentials || !data || data.tracks.length === 0) return null;

  const { kind, tracks } = data;
  const leastPlayed = kind === 'leastPlayed';

  return (
    <ThemedView style={styles.section}>
      <ThemedView style={styles.header}>
        <ThemedText type="defaultBold">
          {leastPlayed ? 'Least played' : "Tunes you haven't heard"}
        </ThemedText>
        {leastPlayed && (
          <ThemedText type="small" themeColor="textSecondary">
            You&apos;ve heard everything — here&apos;s what you&apos;ve played least
          </ThemedText>
        )}
      </ThemedView>
      {tracks.map((track, index) => (
        <ThemedView key={track.id} style={styles.row}>
          <Pressable
            disabled={!track.albumId}
            style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
            onPress={() => router.push(`/home/album/${track.albumId}`)}>
            <CoverArtImage
              uri={getCoverArtUrl(credentials.serverUrl, track.coverArtId, credentials, CoverArtSize.list)}
              style={styles.thumbnail}
            />
            <ThemedView style={styles.text}>
              <ThemedText type="defaultBold" numberOfLines={1}>
                {track.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {track.artist}
              </ThemedText>
            </ThemedView>
          </Pressable>
          {leastPlayed && (
            <ThemedView type="backgroundElement" style={styles.pill}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {`${track.playCount ?? 0} ${track.playCount === 1 ? 'play' : 'plays'}`}
              </ThemedText>
            </ThemedView>
          )}
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Play ${track.title}`}
            onPress={() => PlaybackController.play(tracks, index)}
            style={({ pressed }) => pressed && styles.pressed}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              size={28}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.half,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Radius.sm,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
