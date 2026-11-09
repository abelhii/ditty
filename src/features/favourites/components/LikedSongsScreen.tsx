import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
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
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFavourites } from '@/features/favourites/hooks/use-favourites';
import * as PlaybackController from '@/player/PlaybackController';
import { getCurrentTrack } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/use-player-store';

/** The pinned My Music shortcut's destination (Build Order step 7b, split out of the old
 *  Favourites screen per the v4 restyle — see PLAN.md step 7b amendment): the user's starred
 *  songs (`getStarred2`) as a plain list. Starred albums/artists live behind My Music's own
 *  Albums/Artists filter chips instead. */
export function LikedSongsScreen() {
  const insets = useSafeAreaInsets();
  const credentials = useAuthStore((state) => state.credentials);
  const favouritesQuery = useFavourites();
  const currentTrack = getCurrentTrack(usePlayerStore((state) => state.queue));
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const coverUri = (coverArtId: string | undefined, size: number) =>
    credentials ? getCoverArtUrl(credentials.serverUrl, coverArtId, credentials, size) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Liked Songs
        </ThemedText>

        <QueryState query={favouritesQuery} emptyMessage="Nothing here yet.">
          {({ tracks }) => (
            <FlatList<Track>
              data={tracks}
              keyExtractor={(track) => track.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.three }}
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
  title: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});
