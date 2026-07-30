import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Album } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { AlbumTile } from '@/components/AlbumTile';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAlbumShelf } from '@/features/home/hooks/useAlbumShelf';
import type { Shelf } from '@/features/home/shelves';

/** Fixed tile width for the horizontal carousel — narrower than the genre grid's two-up tiles. */
const TILE_WIDTH = 140;

/**
 * One horizontal discover carousel on the Home screen (Build Order step 9): a section title over a
 * side-scrolling row of {@link AlbumTile}s. A shelf that's still loading shows a slim spinner; one
 * that errored or came back empty renders **nothing** — Home degrades to just the shelves that have
 * content (e.g. only cached shelves when offline) rather than showing per-shelf error blocks.
 */
export function AlbumShelf({ shelf }: { shelf: Shelf }) {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { data, isLoading } = useAlbumShelf(shelf);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <ShelfTitle title={shelf.title} />
        <ActivityIndicator style={styles.loader} />
      </View>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.section}>
      <ShelfTitle title={shelf.title} />
      <FlatList<Album>
        data={data}
        keyExtractor={(album) => album.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item }) =>
          credentials ? (
            <AlbumTile
              album={item}
              width={TILE_WIDTH}
              coverArtUri={getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.list)}
              onPress={() => router.push(`/library/album/${item.id}`)}
            />
          ) : null
        }
      />
    </View>
  );
}

function ShelfTitle({ title }: { title: string }) {
  return (
    <ThemedText type="subtitle" style={styles.title}>
      {title}
    </ThemedText>
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
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  loader: {
    height: TILE_WIDTH,
  },
});
