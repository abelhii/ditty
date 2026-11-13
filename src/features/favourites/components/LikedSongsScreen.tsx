import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { EmptyMessage } from '@/components/EmptyMessage';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DownloadCollectionButton } from '@/features/downloads/components/DownloadCollectionButton';
import { FAVOURITES_ID } from '@/features/downloads/downloads-runtime';
import { useHasPlayableTracks } from '@/features/downloads/hooks/use-has-playable-tracks';
import { useFavourites } from '@/features/favourites/hooks/use-favourites';
import {
  formatTotalDuration,
  LIKED_SORTS,
  sortLikedTracks,
  totalDuration,
  type LikedSortKey,
} from '@/features/favourites/liked-songs';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';
import { useTheme } from '@/hooks/use-theme';
import * as PlaybackController from '@/player/PlaybackController';

/** The pinned My Music shortcut's destination (Build Order step 7b, split out of the old
 *  Favourites screen per the v4 restyle — see PLAN.md step 7b amendment): the user's starred
 *  songs (`getStarred2`) under a header with count, duration, sort, Play, Shuffle and download. Starred albums/artists live behind My Music's own
 *  Albums/Artists filter chips instead. */
export function LikedSongsScreen() {
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const credentials = useAuthStore((state) => state.credentials);
  const favouritesQuery = useFavourites();
  const theme = useTheme();
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [sort, setSort] = useState<LikedSortKey>('recent');
  const starredTracks = favouritesQuery.data?.tracks;
  const sorted = useMemo(() => sortLikedTracks(starredTracks ?? [], sort), [starredTracks, sort]);
  const canPlay = useHasPlayableTracks(starredTracks);

  const coverUri = (coverArtId: string | undefined, size: number) =>
    credentials ? getCoverArtUrl(credentials.serverUrl, coverArtId, credentials, size) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <QueryState query={favouritesQuery} emptyMessage="Nothing here yet.">
          {() => (
            <FlatList<Track>
              data={sorted}
              keyExtractor={(track) => track.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + listBottomInset }}
              refreshing={favouritesQuery.isFetching}
              onRefresh={() => favouritesQuery.refetch()}
              ListHeaderComponent={
                <ThemedView style={styles.header}>
                  <ThemedView style={[styles.heartTile, { backgroundColor: theme.accent }]}>
                    <SymbolView
                      name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
                      size={56}
                      tintColor={theme.onAccent}
                    />
                  </ThemedView>
                  <ThemedText type="title" style={styles.centerText}>
                    Liked Songs
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {sorted.length} {sorted.length === 1 ? 'song' : 'songs'} ·{' '}
                    {formatTotalDuration(totalDuration(sorted))}
                  </ThemedText>
                  <ThemedView style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Play Liked Songs"
                      accessibilityHint={canPlay ? undefined : 'Nothing in Liked Songs is downloaded'}
                      style={({ pressed }) => [pressed && styles.pressed, !canPlay && styles.unavailable]}
                      onPress={() => sorted.length > 0 && PlaybackController.play(sorted, 0)}>
                      <ThemedView style={[styles.playButtonInner, { backgroundColor: theme.accent }]}>
                        <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                          Play
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Shuffle Liked Songs"
                      accessibilityHint={canPlay ? undefined : 'Nothing in Liked Songs is downloaded'}
                      style={({ pressed }) => [pressed && styles.pressed, !canPlay && styles.unavailable]}
                      onPress={() => sorted.length > 0 && PlaybackController.playShuffled(sorted)}>
                      <ThemedView type="backgroundSelected" style={styles.playButtonInner}>
                        <ThemedText type="smallBold">Shuffle</ThemedText>
                      </ThemedView>
                    </Pressable>
                    <DownloadCollectionButton kind="favourites" collectionId={FAVOURITES_ID} tracks={sorted} />
                  </ThemedView>
                  <ThemedView style={styles.sortRow}>
                    {LIKED_SORTS.map((option) => {
                      const active = option.value === sort;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityLabel={`Sort by ${option.label}`}
                          accessibilityState={{ selected: active }}
                          onPress={() => setSort(option.value)}
                          style={[
                            styles.pill,
                            active
                              ? { backgroundColor: theme.accent }
                              : { borderWidth: 1, borderColor: theme.border },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{ color: active ? theme.onAccent : theme.textSecondary }}>
                            {option.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ThemedView>
                </ThemedView>
              }
              ListEmptyComponent={<EmptyMessage text="No starred songs." />}
              renderItem={({ item, index }) => (
                <TrackRow
                  track={item}
                  coverArtUri={coverUri(item.coverArtId, CoverArtSize.list)}
                  onPress={() => PlaybackController.play(sorted, index)}
                  onOverflowPress={() => setMenuTrack(item)}
                />
              )}
            />
          )}
        </QueryState>
      </SafeAreaView>

      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
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
    padding: Spacing.four,
  },
  heartTile: {
    width: 160,
    height: 160,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  playButtonInner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
  // Greyed, but still tappable so PlaybackController's Notice can say why nothing plays.
  unavailable: {
    opacity: 0.4,
  },
});
