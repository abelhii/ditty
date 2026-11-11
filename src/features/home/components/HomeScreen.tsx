import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { AlbumShelf } from '@/features/home/components/AlbumShelf';
import { CollectionCard } from '@/features/home/components/CollectionCard';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { MostPlayedTracks } from '@/features/home/components/MostPlayedTracks';
import { UnheardTracks } from '@/features/home/components/UnheardTracks';
import { WideHome } from '@/features/home/components/WideHome';
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
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
          </ThemedView>

          {recentlyAdded && (
            <AlbumShelf shelf={recentlyAdded} onSeeAll={() => router.push('/library')} />
          )}
          {frequentlyPlayed && <AlbumShelf shelf={frequentlyPlayed} />}
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
  likesIcon: {
    width: LIKES_ICON_SIZE,
    height: LIKES_ICON_SIZE,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
