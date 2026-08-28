import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Artist, Playlist } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { AlbumTile } from '@/components/AlbumTile';
import { ArtistRow } from '@/components/ArtistRow';
import { CoverArtImage } from '@/components/CoverArtImage';
import { EmptyMessage } from '@/components/EmptyMessage';
import { QueryState } from '@/components/QueryState';
import { TextPromptModal } from '@/components/TextPromptModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFavourites } from '@/features/favourites/hooks/use-favourites';
import { useCreatePlaylist } from '@/features/playlists/hooks/use-create-playlist';
import { usePlaylists } from '@/features/playlists/hooks/use-playlists';
import { useTheme } from '@/hooks/use-theme';

type MyMusicFilter = 'playlists' | 'albums' | 'artists';

const GRID_COLUMNS = 2;
const GRID_GAP = Spacing.four;

/** The My Music tab (Build Order step 7b, merged with the old Favourites screen per the v4 restyle
 *  — see PLAN.md step 7b amendment): a pinned Liked Songs shortcut, then Playlists / Albums /
 *  Artists behind a filter-chip row — one entity type visible at a time, since favourites can grow
 *  large (contrast Search's combined scroll). Deliberately *not* named "Library" — see CONTEXT.md. */
export function MyMusicScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const credentials = useAuthStore((state) => state.credentials);
  const playlistsQuery = usePlaylists();
  const favouritesQuery = useFavourites();
  const createPlaylist = useCreatePlaylist();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<MyMusicFilter>('playlists');

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.four * 2;
  const tileWidth = (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const listContentStyle = { paddingBottom: insets.bottom + BottomTabInset + Spacing.three };

  const coverUri = (coverArtId: string | undefined, size: number) =>
    credentials ? getCoverArtUrl(credentials.serverUrl, coverArtId, credentials, size) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.titleRow}>
          <ThemedText type="title">My Music</ThemedText>
          <Pressable
            hitSlop={12}
            accessibilityLabel="New playlist"
            onPress={() => setCreating(true)}
            style={({ pressed }) => pressed && styles.pressed}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={24} tintColor={theme.text} />
          </Pressable>
        </ThemedView>

        <Pressable
          style={({ pressed }) => [styles.likedSongsRow, pressed && styles.pressed]}
          onPress={() => router.push('/my-music/liked-songs')}>
          <ThemedView style={[styles.likedSongsIcon, { backgroundColor: theme.accent }]}>
            <SymbolView
              name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
              size={20}
              tintColor={theme.tint}
            />
          </ThemedView>
          <ThemedView style={styles.rowText}>
            <ThemedText type="smallBold">Liked Songs</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Songs you&apos;ve starred
            </ThemedText>
          </ThemedView>
        </Pressable>

        <ThemedView style={styles.chips}>
          <FilterChip
            label="Playlists"
            active={filter === 'playlists'}
            onPress={() => setFilter('playlists')}
          />
          <FilterChip label="Albums" active={filter === 'albums'} onPress={() => setFilter('albums')} />
          <FilterChip
            label="Artists"
            active={filter === 'artists'}
            onPress={() => setFilter('artists')}
          />
        </ThemedView>

        {filter === 'playlists' ? (
          <QueryState query={playlistsQuery} emptyMessage="No playlists yet.">
            {(playlists) => (
              <FlatList<Playlist>
                data={playlists}
                keyExtractor={(playlist) => playlist.id}
                contentContainerStyle={listContentStyle}
                refreshing={playlistsQuery.isFetching}
                onRefresh={() => playlistsQuery.refetch()}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    onPress={() => router.push(`/my-music/playlist/${item.id}`)}>
                    <CoverArtImage
                      uri={coverUri(item.coverArtId, CoverArtSize.list)}
                      style={styles.cover}
                    />
                    <ThemedView style={styles.rowText}>
                      <ThemedText numberOfLines={1}>{item.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.songCount} {item.songCount === 1 ? 'song' : 'songs'}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                )}
              />
            )}
          </QueryState>
        ) : (
          <QueryState query={favouritesQuery} emptyMessage="Nothing here yet.">
            {({ albums, artists }) =>
              filter === 'artists' ? (
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
              ) : (
                <ScrollView contentContainerStyle={listContentStyle}>
                  {albums.length === 0 ? (
                    <EmptyMessage text="No starred albums." />
                  ) : (
                    <ThemedView style={styles.albumGrid}>
                      {albums.map((album) => (
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
              )
            }
          </QueryState>
        )}
      </SafeAreaView>

      <TextPromptModal
        visible={creating}
        title="New playlist"
        placeholder="Playlist name"
        submitLabel="Create"
        onSubmit={(name) => {
          createPlaylist.mutate(name);
          setCreating(false);
        }}
        onClose={() => setCreating(false)}
      />
    </ThemedView>
  );
}

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterChip({ label, active, onPress }: FilterChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      style={[
        styles.chip,
        active
          ? { backgroundColor: theme.accent }
          : { borderWidth: 1, borderColor: theme.backgroundSelected },
      ]}
      onPress={onPress}>
      <ThemedText type="smallBold" style={active ? { color: theme.tint } : { color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const THUMBNAIL_SIZE = 48;

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  likedSongsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  likedSongsIcon: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  cover: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Radius.sm,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
