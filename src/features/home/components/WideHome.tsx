import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { AlbumGridGap } from '@/components/album-grid';
import { AlbumTile } from '@/components/AlbumTile';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WideTopBar } from '@/components/WideTopBar';
import { Radius, Spacing, WideMaxContentWidth } from '@/constants/theme';
import { CollectionCard } from '@/features/home/components/CollectionCard';
import { ExploreArtists } from '@/features/home/components/ExploreArtists';
import { MostPlayedTracks } from '@/features/home/components/MostPlayedTracks';
import { UnheardTracks } from '@/features/home/components/UnheardTracks';
import { greetingForHour } from '@/features/home/greeting';
import { useAlbumShelf } from '@/features/home/hooks/use-album-shelf';
import { homeShelves } from '@/features/home/shelves';
import { wideHomeLayout } from '@/features/home/wide-grid';
import { usePlaylists } from '@/features/playlists/hooks/use-playlists';
import { useTheme } from '@/hooks/use-theme';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';

const LIKES_ICON_SIZE = 48;
const JUMP_BACK_COLUMNS = 3;
/** Your Likes plus this many playlists fill the two rows of the Jump back in grid. */
const PLAYLIST_CARD_COUNT = 5;

/**
 * Home in the wide layout (the "Web home" design): a top bar whose search field opens Search, the
 * greeting, then Jump back in (Your Likes + playlists), Recently added, Explore artists and
 * "Tunes you haven't heard". Album and artist rows reflow between 6, 4 and 3 columns with width.
 */
export function WideHome() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const { width } = useWindowDimensions();
  const credentials = useAuthStore((state) => state.credentials);
  const playlists = usePlaylists().data ?? [];
  const { contentWidth, columns, tileWidth } = wideHomeLayout(width);
  const cardWidth = (contentWidth - Spacing.three * (JUMP_BACK_COLUMNS - 1)) / JUMP_BACK_COLUMNS;

  const shelves = useMemo(() => homeShelves(new Date().getFullYear()), []);
  const recentlyAdded = shelves.find((shelf) => shelf.id === 'recentlyAdded');
  const explore = shelves.find((shelf) => shelf.id === 'explore');
  const frequentlyPlayed = shelves.find((shelf) => shelf.id === 'frequentlyPlayed');
  const albums = useAlbumShelf(recentlyAdded ?? shelves[0]).data?.slice(0, columns) ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + listBottomInset,
            gap: Spacing.five,
          }}>
          <WideTopBar value="" onFocus={() => router.push('/search')} />

          <ThemedText type="title" style={styles.greeting}>
            {greetingForHour(new Date().getHours())}
          </ThemedText>

          <ThemedView style={styles.section}>
            <ThemedText type="defaultBold">Jump back in</ThemedText>
            <ThemedView style={styles.cards}>
              <View style={{ width: cardWidth }}>
                <CollectionCard
                  title="Your Likes"
                  onPress={() => router.push('/home/liked-songs')}
                  leading={
                    <ThemedView style={[styles.likesIcon, { backgroundColor: theme.accent }]}>
                      <SymbolView
                        name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
                        size={24}
                        tintColor={theme.tint}
                      />
                    </ThemedView>
                  }
                />
              </View>
              {playlists.slice(0, PLAYLIST_CARD_COUNT).map((playlist) => (
                <View key={playlist.id} style={{ width: cardWidth }}>
                  <CollectionCard
                    title={playlist.name}
                    subtitle={`${playlist.songCount} songs`}
                    onPress={() => router.push(`/home/playlist/${playlist.id}`)}
                  />
                </View>
              ))}
            </ThemedView>
          </ThemedView>

          {credentials && albums.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="defaultBold">Recently added</ThemedText>
              <ThemedView style={styles.row}>
                {albums.map((album, index) => (
                  <AlbumTile
                    key={album.id}
                    album={album}
                    width={tileWidth}
                    round={index === 0}
                    coverArtUri={getCoverArtUrl(credentials.serverUrl, album.coverArtId, credentials, CoverArtSize.grid)}
                    onPress={() => router.push(`/home/album/${album.id}`)}
                  />
                ))}
              </ThemedView>
            </ThemedView>
          )}

          <ExploreArtists count={columns} tileWidth={tileWidth} />
          {frequentlyPlayed && <MostPlayedTracks shelf={frequentlyPlayed} />}
          {explore && <UnheardTracks shelf={explore} />}
        </ScrollView>
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
    maxWidth: WideMaxContentWidth,
    width: '100%',
  },
  greeting: {
    paddingHorizontal: Spacing.four,
  },
  section: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: AlbumGridGap,
  },
  likesIcon: {
    width: LIKES_ICON_SIZE,
    height: LIKES_ICON_SIZE,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
