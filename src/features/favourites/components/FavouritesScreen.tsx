import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Album, Artist, Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { AlbumTile } from '@/components/AlbumTile';
import { ArtistRow } from '@/components/ArtistRow';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFavourites } from '@/features/favourites/hooks/useFavourites';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/usePlayerStore';

type FavouritesView = 'songs' | 'albums' | 'artists';

const GRID_COLUMNS = 2;
const GRID_GAP = Spacing.four;

/** The Favourites screen (Build Order step 7b): the three starred collections behind a segmented
 *  control. Each collection gets its own layout — songs as rows, albums as a grid, artists as rows —
 *  since favourites can grow large (contrast search's combined scroll). */
export function FavouritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const credentials = useAuthStore((state) => state.credentials);
  const favouritesQuery = useFavourites();
  const currentTrack = getCurrentTrack(usePlayerStore((state) => state.queue));
  const [view, setView] = useState<FavouritesView>('songs');
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.four * 2;
  const tileWidth = (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const listContentStyle = { paddingBottom: insets.bottom + BottomTabInset + Spacing.three };

  const coverUri = (coverArtId: string | undefined, size: number) =>
    credentials ? getCoverArtUrl(credentials.serverUrl, coverArtId, credentials, size) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Favourites
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.segmented}>
          <SegmentButton label="Songs" active={view === 'songs'} onPress={() => setView('songs')} />
          <SegmentButton label="Albums" active={view === 'albums'} onPress={() => setView('albums')} />
          <SegmentButton label="Artists" active={view === 'artists'} onPress={() => setView('artists')} />
        </ThemedView>

        <QueryState query={favouritesQuery} emptyMessage="Nothing here yet.">
          {({ tracks, albums, artists }) => {
            if (view === 'songs') {
              return (
                <FlatList<Track>
                  data={tracks}
                  keyExtractor={(track) => track.id}
                  contentContainerStyle={listContentStyle}
                  refreshing={favouritesQuery.isFetching}
                  onRefresh={() => favouritesQuery.refetch()}
                  ListEmptyComponent={<EmptyMessage text="No starred songs." />}
                  renderItem={({ item }) => (
                    <TrackRow
                      track={item}
                      coverArtUri={coverUri(item.coverArtId, CoverArtSize.list)}
                      isPlaying={currentTrack?.id === item.id}
                      onPress={() => PlaybackController.playNow(item)}
                      onOverflowPress={() => setMenuTrack(item)}
                    />
                  )}
                />
              );
            }

            if (view === 'artists') {
              return (
                <FlatList<Artist>
                  data={artists}
                  keyExtractor={(artist) => artist.id}
                  contentContainerStyle={listContentStyle}
                  refreshing={favouritesQuery.isFetching}
                  onRefresh={() => favouritesQuery.refetch()}
                  ListEmptyComponent={<EmptyMessage text="No starred artists." />}
                  renderItem={({ item }) => (
                    <ArtistRow
                      artist={item}
                      coverArtUri={coverUri(item.coverArtId, CoverArtSize.list)}
                      onPress={() => router.push(`/my-music/artist/${item.id}`)}
                    />
                  )}
                />
              );
            }

            return (
              <ScrollView contentContainerStyle={listContentStyle}>
                {albums.length === 0 ? (
                  <EmptyMessage text="No starred albums." />
                ) : (
                  <ThemedView style={styles.albumGrid}>
                    {albums.map((album: Album) => (
                      <AlbumTile
                        key={album.id}
                        album={album}
                        width={tileWidth}
                        coverArtUri={coverUri(album.coverArtId, CoverArtSize.list)}
                        onPress={() => router.push(`/my-music/album/${album.id}`)}
                      />
                    ))}
                  </ThemedView>
                )}
              </ScrollView>
            );
          }}
        </QueryState>
      </SafeAreaView>

      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </ThemedView>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
      {text}
    </ThemedText>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.segmentButton, pressed && styles.pressed]} onPress={onPress}>
      <ThemedView type={active ? 'backgroundSelected' : undefined} style={styles.segmentButtonInner}>
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
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
  },
  segmented: {
    flexDirection: 'row',
    margin: Spacing.four,
    borderRadius: Spacing.three,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  segmentButton: {
    flex: 1,
  },
  segmentButtonInner: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
