import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { albumGridLayout, AlbumGridGap } from '@/components/album-grid';
import { CoverArtImage } from '@/components/CoverArtImage';
import { FilterChip } from '@/components/FilterChip';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Radius, Spacing, WideMaxContentWidth } from '@/constants/theme';
import { useRecentlyAddedAlbums } from '@/features/home/hooks/use-recently-added-albums';
import {
  groupByRecency,
  itemCaption,
  type RecentFilter,
  type RecentItem,
  recentItems,
  type RecentListEntry,
  toListEntries,
} from '@/features/home/recently-added';
import { usePlaylists } from '@/features/playlists/hooks/use-playlists';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';

const FILTERS: { id: RecentFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'albums', label: 'Albums' },
  { id: 'playlists', label: 'Playlists' },
];

/**
 * Home's "See all" for Recently added: albums (paged, by date added) and Playlists (by created),
 * newest first under This week / This month / Earlier headings, filterable by type. There's no
 * Songs chip — Subsonic has no recently-added Tracks source.
 */
export function RecentlyAddedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const { width, scale } = useWindowDimensions();
  const wide = useIsWideLayout();
  const credentials = useAuthStore((state) => state.credentials);
  const albumsQuery = useRecentlyAddedAlbums();
  const playlistsQuery = usePlaylists();
  const [filter, setFilter] = useState<RecentFilter>('all');

  const { columns, tileWidth, coverArtSize } = albumGridLayout(width, scale, wide);
  const now = new Date().getTime();

  const albums = albumsQuery.data?.pages.flat() ?? [];
  const items = recentItems(albums, playlistsQuery.data ?? [], filter, albumsQuery.hasNextPage);
  const entries = toListEntries(groupByRecency(items, now), columns);
  // The Playlists chip depends only on the playlists query; the others on the albums query.
  const source = filter === 'playlists' ? playlistsQuery : albumsQuery;

  const refreshing = (albumsQuery.isFetching && !albumsQuery.isFetchingNextPage) || playlistsQuery.isFetching;
  const refresh = () => {
    void albumsQuery.refetch();
    void playlistsQuery.refetch();
  };

  const open = (item: RecentItem) =>
    router.push(item.kind === 'album' ? `/home/album/${item.id}` : `/home/playlist/${item.id}`);

  const renderEntry = ({ item: entry }: { item: RecentListEntry }) => {
    if (entry.type === 'heading') {
      return (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.heading}>
          {entry.title}
        </ThemedText>
      );
    }
    return (
      <View style={styles.row}>
        {entry.items.map((tile) => (
          <Pressable
            key={`${tile.kind}-${tile.id}`}
            accessibilityRole="button"
            style={({ pressed }) => [styles.tile, { width: tileWidth }, pressed && styles.pressed]}
            onPress={() => open(tile)}>
            <CoverArtImage
              uri={
                credentials
                  ? getCoverArtUrl(credentials.serverUrl, tile.coverArtId, credentials, coverArtSize)
                  : undefined
              }
              style={[styles.cover, { width: tileWidth, height: tileWidth }]}
              iconSize={32}
            />
            <ThemedText type="small" numberOfLines={1}>
              {tile.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {itemCaption(tile, now)}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={[styles.safeArea, wide && styles.safeAreaWide]} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Recently added
        </ThemedText>

        <ThemedView style={styles.chips}>
          {FILTERS.map(({ id, label }) => (
            <FilterChip key={id} label={label} active={filter === id} onPress={() => setFilter(id)} />
          ))}
        </ThemedView>

        <QueryState
          query={{
            isLoading: source.isLoading,
            isError: source.isError,
            error: source.error,
            data: source.data === undefined ? undefined : entries,
            refetch: source.refetch,
          }}
          isEmpty={(data) => data.length === 0}
          emptyMessage={filter === 'playlists' ? 'No playlists yet.' : 'Nothing added yet.'}>
          {(data) => (
            <FlatList<RecentListEntry>
              data={data}
              keyExtractor={(entry) => entry.key}
              // The row layout depends on the column count, so remount when it changes.
              key={columns}
              contentContainerStyle={{
                paddingHorizontal: Spacing.four,
                paddingBottom: insets.bottom + listBottomInset,
              }}
              renderItem={renderEntry}
              refreshing={refreshing}
              onRefresh={refresh}
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                if (filter !== 'playlists' && albumsQuery.hasNextPage && !albumsQuery.isFetchingNextPage) {
                  void albumsQuery.fetchNextPage();
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
  safeAreaWide: {
    maxWidth: WideMaxContentWidth,
  },
  title: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  heading: {
    textTransform: 'uppercase',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: AlbumGridGap,
    marginBottom: AlbumGridGap,
  },
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
  footer: {
    marginVertical: Spacing.four,
  },
});
