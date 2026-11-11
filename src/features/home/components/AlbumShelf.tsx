import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Album } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { AlbumTile } from '@/components/AlbumTile';
import { ThemedText } from '@/components/ThemedText';
import { Carousel } from '@/features/home/components/Carousel';
import { useAlbumShelf } from '@/features/home/hooks/use-album-shelf';
import type { Shelf } from '@/features/home/shelves';

/** Fixed tile width for the horizontal carousel — narrower than the genre grid's two-up tiles. */
const TILE_WIDTH = 96;

type AlbumShelfProps = {
  shelf: Shelf;
  /** Shows a "See all" link in the header (mobile Home design). */
  onSeeAll?: () => void;
};

/**
 * One horizontal discover carousel on the Home screen (Build Order step 9): a section title over a
 * side-scrolling row of {@link AlbumTile}s, with scroll and refresh controls (see {@link Carousel}).
 * A shelf that errored or came back empty renders **nothing** — Home degrades to just the shelves
 * that have content (e.g. only cached shelves when offline) rather than per-shelf error blocks.
 */
export function AlbumShelf({ shelf, onSeeAll }: AlbumShelfProps) {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { data, isLoading, isFetching, refetch } = useAlbumShelf(shelf);

  return (
    <Carousel<Album>
      title={shelf.title}
      data={data}
      loading={isLoading}
      loadingHeight={TILE_WIDTH}
      keyExtractor={(album) => album.id}
      onRefresh={() => void refetch()}
      refreshing={isFetching}
      headerExtra={
        onSeeAll && (
          <Pressable accessibilityRole="link" onPress={onSeeAll} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="smallBold" themeColor="accent">
              See all
            </ThemedText>
          </Pressable>
        )
      }
      renderItem={({ item }) =>
        credentials ? (
          <AlbumTile
            album={item}
            width={TILE_WIDTH}
            coverArtUri={getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.list)}
            onPress={() => router.push(`/home/album/${item.id}`)}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
});
