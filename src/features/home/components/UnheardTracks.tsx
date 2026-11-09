import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import type { Album } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import { useAlbumShelf } from '@/features/home/hooks/use-album-shelf';
import type { Shelf } from '@/features/home/shelves';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';

const THUMBNAIL_SIZE = 52;
const ROW_LIMIT = 4;

/**
 * The "Tunes you haven't heard" list: a few rows from the Explore shelf (random albums — Subsonic
 * has no "never played" filter), each with a play button that queues the album. Renders nothing
 * while loading, on error, or when empty, like {@link AlbumShelf}.
 */
export function UnheardTracks({ shelf }: { shelf: Shelf }) {
  const router = useRouter();
  const theme = useTheme();
  const credentials = useAuthStore((state) => state.credentials);
  const { data } = useAlbumShelf(shelf);

  if (!credentials || !data || data.length === 0) return null;

  const playAlbum = async (album: Album) => {
    const { tracks } = await getAlbum(credentials.serverUrl, credentials, album.id);
    if (tracks.length > 0) PlaybackController.play(tracks, 0);
  };

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="defaultBold" style={styles.title}>
        Tunes you haven&apos;t heard
      </ThemedText>
      {data.slice(0, ROW_LIMIT).map((album) => (
        <ThemedView key={album.id} style={styles.row}>
          <Pressable
            style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
            onPress={() => router.push(`/home/album/${album.id}`)}>
            <CoverArtImage
              uri={getCoverArtUrl(credentials.serverUrl, album.coverArtId, credentials, CoverArtSize.list)}
              style={styles.thumbnail}
            />
            <ThemedView style={styles.text}>
              <ThemedText type="defaultBold" numberOfLines={1}>
                {album.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {album.artist}
              </ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Play ${album.name}`}
            onPress={() => playAlbum(album)}
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
  title: {
    paddingHorizontal: Spacing.four,
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
