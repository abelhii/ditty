import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Album } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { AlbumTile } from '@/components/AlbumTile';
import { CoverArtImage } from '@/components/CoverArtImage';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useArtist } from '@/features/library/hooks/useArtist';

const GRID_COLUMNS = 2;
const GRID_GAP = Spacing.four;

type ArtistDetailScreenProps = {
  artistId: string;
};

/** An artist's albums — a pure drill-down, no "play all songs by artist" (getArtist doesn't
 *  return a flat song list, and it isn't in the Feature List). */
export function ArtistDetailScreen({ artistId }: ArtistDetailScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const credentials = useAuthStore((state) => state.credentials);
  const artistQuery = useArtist(artistId);

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.four * 2;
  const tileWidth = (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <QueryState query={artistQuery} emptyMessage="Artist not found.">
          {({ artist, albums }) => (
            <FlatList<Album>
              data={albums}
              keyExtractor={(album) => album.id}
              numColumns={GRID_COLUMNS}
              columnWrapperStyle={styles.row}
              contentContainerStyle={{
                padding: Spacing.four,
                paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
                gap: GRID_GAP,
              }}
              ListHeaderComponent={
                <ThemedView style={styles.header}>
                  <CoverArtImage
                    uri={
                      credentials
                        ? getCoverArtUrl(credentials.serverUrl, artist.coverArtId, credentials, CoverArtSize.detail)
                        : undefined
                    }
                    style={styles.headerArt}
                    iconSize={48}
                  />
                  <ThemedText type="subtitle">{artist.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                  </ThemedText>
                </ThemedView>
              }
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
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  headerArt: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: Spacing.two,
  },
  row: {
    gap: GRID_GAP,
  },
});
