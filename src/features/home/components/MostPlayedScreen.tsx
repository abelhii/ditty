import { useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { EmptyMessage } from '@/components/EmptyMessage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useMostPlayedTracks } from '@/features/home/hooks/use-most-played-tracks';
import { MOST_PLAYED_FULL } from '@/features/home/most-played';
import { homeShelves, type Shelf } from '@/features/home/shelves';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';
import * as PlaybackController from '@/player/PlaybackController';

/** The full Most played list, opened from Home's "View more": Tracks ranked by play count, with
 *  pull-to-refresh. Tapping a row replaces the queue with the whole list. */
export function MostPlayedScreen() {
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const credentials = useAuthStore((state) => state.credentials);
  const shelf = useMemo(
    () => homeShelves(new Date().getFullYear()).find((candidate) => candidate.id === 'frequentlyPlayed'),
    [],
  );
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  if (!shelf) return null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Most played
        </ThemedText>
        <MostPlayedList
          shelf={shelf}
          coverUri={(coverArtId) =>
            credentials ? getCoverArtUrl(credentials.serverUrl, coverArtId, credentials, CoverArtSize.list) : undefined
          }
          bottomInset={insets.bottom + listBottomInset}
          onOverflowPress={setMenuTrack}
        />
      </SafeAreaView>
      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </ThemedView>
  );
}

type MostPlayedListProps = {
  shelf: Shelf;
  coverUri: (coverArtId: string | undefined) => string | undefined;
  bottomInset: number;
  onOverflowPress: (track: Track) => void;
};

function MostPlayedList({ shelf, coverUri, bottomInset, onOverflowPress }: MostPlayedListProps) {
  const { tracks, refresh, refreshing } = useMostPlayedTracks(shelf, MOST_PLAYED_FULL);

  return (
    <FlatList<Track>
      data={tracks}
      keyExtractor={(track) => track.id}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      ListEmptyComponent={<EmptyMessage text="Nothing played yet." />}
      renderItem={({ item, index }) => (
        <TrackRow
          track={item}
          coverArtUri={coverUri(item.coverArtId)}
          detail={`${item.playCount} ${item.playCount === 1 ? 'play' : 'plays'}`}
          onPress={() => PlaybackController.play(tracks, index)}
          onOverflowPress={() => onOverflowPress(item)}
        />
      )}
    />
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
