import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { AlbumShelf } from '@/features/home/components/AlbumShelf';
import { CollectionCard } from '@/features/home/components/CollectionCard';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { HomeStatusMessage } from '@/features/home/components/HomeStatusMessage';
import { MostPlayedTracks } from '@/features/home/components/MostPlayedTracks';
import { UnheardTracks } from '@/features/home/components/UnheardTracks';
import { WideHome } from '@/features/home/components/WideHome';
import { useHomeShelves } from '@/features/home/hooks/use-home-shelves';
import { homeShelves } from '@/features/home/shelves';
import { usePlaylists } from '@/features/playlists/hooks/use-playlists';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { useTheme } from '@/hooks/use-theme';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';

const LIKES_ICON_SIZE = 64;
/** How many playlists the quick-access grid shows, two per row. */
const PLAYLIST_CARD_COUNT = 2;

/**
 * The Home tab (mobile design): greeting header, a quick-access grid (Your Likes plus the first
 * playlists), the Recently Added and Frequently Played shelves, and a "Tunes you haven't heard" list. Deliberately
 * query-less — text search is the Search tab's job.
 */
export function HomeScreen() {
  const wide = useIsWideLayout();
  return wide ? <WideHome /> : <NarrowHome />;
}

function NarrowHome() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const playlists = usePlaylists().data ?? [];
  // Injected once per mount so New Releases' year window is stable across re-renders.
  const shelves = useMemo(() => homeShelves(new Date().getFullYear()), []);
  const recentlyAdded = shelves.find((shelf) => shelf.id === 'recentlyAdded');
  const explore = shelves.find((shelf) => shelf.id === 'explore');
  const frequentlyPlayed = shelves.find((shelf) => shelf.id === 'frequentlyPlayed');
  const { status, refresh, refreshing } = useHomeShelves();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
          contentContainerStyle={{
            paddingTop: Spacing.three,
            paddingBottom: insets.bottom + listBottomInset,
            gap: Spacing.five,
          }}>
          <HomeHeader />

          <ThemedView style={styles.grid}>
            <CollectionCard
              title="Your Likes"
              onPress={() => router.push('/home/liked-songs')}
              leading={
                <ThemedView style={[styles.likesIcon, { backgroundColor: theme.accent }]}>
                  <SymbolView
                    name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
                    size={28}
                    tintColor={theme.tint}
                  />
                </ThemedView>
              }
            />
            <ThemedView style={styles.playlistRow}>
              {playlists.slice(0, PLAYLIST_CARD_COUNT).map((playlist) => (
                <CollectionCard
                  key={playlist.id}
                  title={playlist.name}
                  subtitle={`${playlist.songCount} songs`}
                  onPress={() => router.push(`/home/playlist/${playlist.id}`)}
                />
              ))}
            </ThemedView>
            {/* Only the first playlists fit above; My Music lists them all, plus starred Albums and
                Artists and New playlist. */}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="See all in My Music"
              onPress={() => router.push('/home/my-music')}
              style={({ pressed }) => [styles.myMusicLink, pressed && styles.pressed]}>
              <ThemedText type="smallBold">My Music</ThemedText>
              <ThemedText type="smallBold" themeColor="accent">
                See all
              </ThemedText>
            </Pressable>
          </ThemedView>

          {recentlyAdded && (
            <AlbumShelf shelf={recentlyAdded} onSeeAll={() => router.push('/home/recently-added')} />
          )}
          {frequentlyPlayed && <AlbumShelf shelf={frequentlyPlayed} />}
          {frequentlyPlayed && <MostPlayedTracks shelf={frequentlyPlayed} />}
          {explore && <UnheardTracks shelf={explore} />}
          <HomeStatusMessage status={status} onRetry={() => void refresh()} />
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
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  grid: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  playlistRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  myMusicLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  likesIcon: {
    width: LIKES_ICON_SIZE,
    height: LIKES_ICON_SIZE,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
