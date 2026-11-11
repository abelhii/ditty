import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { QueryState } from '@/components/QueryState';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { ListControls } from '@/features/library/components/ListControls';
import { useAllSongs } from '@/features/library/hooks/use-all-songs';
import { sortTracks, TRACK_SORTS, type SortDirection, type TrackSortKey } from '@/features/library/list-sort';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';
import * as PlaybackController from '@/player/PlaybackController';

/** Every song on the server as one paged list, with a text filter (the server's own search, so it
 *  covers every song) and a sort over the songs loaded so far. Tapping a row queues the songs
 *  shown, starting at that row. */
export function AllSongsList() {
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const credentials = useAuthStore((state) => state.credentials);
  const [input, setInput] = useState('');
  const [sort, setSort] = useState<TrackSortKey>('default');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const filter = useDebouncedValue(input.trim(), 300);
  const songsQuery = useAllSongs(filter);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const pages = songsQuery.data?.pages;
  const tracks = useMemo(() => sortTracks(pages?.flat() ?? [], sort, direction), [pages, sort, direction]);

  return (
    <>
      <ListControls
        query={input}
        onQueryChange={setInput}
        placeholder="Filter songs"
        sortOptions={TRACK_SORTS}
        sort={sort}
        onSortChange={setSort}
        direction={direction}
        onDirectionChange={setDirection}
      />
      <QueryState
        query={songsQuery}
        isEmpty={(data) => data.pages.every((page) => page.length === 0)}
        emptyMessage={filter ? 'No songs match.' : 'No songs found.'}
      >
        {() => (
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
        )}
      </QueryState>
      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </>
  );
}
