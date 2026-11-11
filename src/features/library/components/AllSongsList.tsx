import { useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { QueryState } from '@/components/QueryState';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { useAllSongs } from '@/features/library/hooks/use-all-songs';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';
import * as PlaybackController from '@/player/PlaybackController';

/** Every song on the server as one paged list. Tapping a row queues the songs loaded so far,
 *  starting at that row. */
export function AllSongsList() {
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const credentials = useAuthStore((state) => state.credentials);
  const songsQuery = useAllSongs();
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  return (
    <>
      <QueryState
        query={songsQuery}
        isEmpty={(data) => data.pages.every((page) => page.length === 0)}
        emptyMessage="No songs found.">
        {(data) => {
          const tracks = data.pages.flat();
          return (
            <FlatList<Track>
              data={tracks}
              keyExtractor={(track) => track.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + listBottomInset }}
              refreshing={songsQuery.isRefetching}
              onRefresh={() => songsQuery.refetch()}
              onEndReached={() => {
                if (songsQuery.hasNextPage && !songsQuery.isFetchingNextPage) {
                  songsQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={1.5}
              ListFooterComponent={songsQuery.isFetchingNextPage ? <ActivityIndicator /> : null}
              renderItem={({ item, index }) => (
                <TrackRow
                  track={item}
                  coverArtUri={
                    credentials
                      ? getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.list)
                      : undefined
                  }
                  onPress={() => PlaybackController.play(tracks, index)}
                  onOverflowPress={() => setMenuTrack(item)}
                />
              )}
            />
          );
        }}
      </QueryState>
      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </>
  );
}
