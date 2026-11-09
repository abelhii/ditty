import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Album } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { AlbumTile } from '@/components/AlbumTile';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAlbumsByGenre } from '@/features/library/hooks/use-albums-by-genre';

const GRID_COLUMNS = 2;
const GRID_GAP = Spacing.four;

type GenreAlbumsScreenProps = {
  genre: string;
};

/** Albums for one genre — the one real pagination surface in the library (Build Order step 5):
 *  a paginated grid backed by getAlbumList2 (type=byGenre), 500 albums per page. */
export function GenreAlbumsScreen({ genre }: GenreAlbumsScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const credentials = useAuthStore((state) => state.credentials);
  const albumsQuery = useAlbumsByGenre(genre);

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.four * 2;
  const tileWidth = (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          {genre}
        </ThemedText>

        <QueryState
          query={albumsQuery}
          isEmpty={(data) => data.pages.every((page) => page.length === 0)}
          emptyMessage="No albums found for this genre.">
          {(data) => (
            <FlatList<Album>
              data={data.pages.flat()}
              keyExtractor={(album) => album.id}
              numColumns={GRID_COLUMNS}
              columnWrapperStyle={styles.row}
              contentContainerStyle={{
                padding: Spacing.four,
                paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
                gap: GRID_GAP,
              }}
              renderItem={({ item }) =>
                credentials ? (
                  <AlbumTile
                    album={item}
                    width={tileWidth}
                    coverArtUri={getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.list)}
                    onPress={() => router.push(`/library/album/${item.id}`)}
                  />
                ) : null
              }
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                if (albumsQuery.hasNextPage && !albumsQuery.isFetchingNextPage) {
                  albumsQuery.fetchNextPage();
                }
              }}
              ListFooterComponent={albumsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
            />
          )}
        </QueryState>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  row: {
    gap: GRID_GAP,
  },
  footer: {
    marginVertical: Spacing.four,
  },
});
