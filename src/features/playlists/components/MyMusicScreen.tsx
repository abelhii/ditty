import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Playlist } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import { CoverArtImage } from '@/components/CoverArtImage';
import { QueryState } from '@/components/QueryState';
import { TextPromptModal } from '@/components/TextPromptModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCreatePlaylist } from '@/features/playlists/hooks/useCreatePlaylist';
import { usePlaylists } from '@/features/playlists/hooks/usePlaylists';
import { useTheme } from '@/hooks/use-theme';

/** The My Music tab (Build Order step 7b): the user's playlists as a vertical list with a pinned
 *  Favourites shortcut at the top. Deliberately *not* named "Library" — see CONTEXT.md. */
export function MyMusicScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const credentials = useAuthStore((state) => state.credentials);
  const playlistsQuery = usePlaylists();
  const createPlaylist = useCreatePlaylist();
  const [creating, setCreating] = useState(false);

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

        <QueryState query={playlistsQuery} emptyMessage="No playlists yet.">
          {(playlists) => (
            <FlatList<Playlist>
              data={playlists}
              keyExtractor={(playlist) => playlist.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.three }}
              refreshing={playlistsQuery.isFetching}
              onRefresh={() => playlistsQuery.refetch()}
              ListHeaderComponent={
                <Pressable
                  style={({ pressed }) => [styles.favouritesRow, pressed && styles.pressed]}
                  onPress={() => router.push('/my-music/favourites')}>
                  <ThemedView type="backgroundSelected" style={styles.favouritesIcon}>
                    <SymbolView
                      name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
                      size={24}
                      tintColor="#e0245e"
                    />
                  </ThemedView>
                  <ThemedView style={styles.rowText}>
                    <ThemedText>Favourites</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Songs, albums & artists you&apos;ve starred
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() => router.push(`/my-music/playlist/${item.id}`)}>
                  <CoverArtImage
                    uri={
                      credentials
                        ? getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.list)
                        : undefined
                    }
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
  favouritesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  favouritesIcon: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
