import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { QueryState } from '@/components/QueryState';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { AlphabetIndex } from '@/features/library/components/AlphabetIndex';
import { ListControls } from '@/features/library/components/ListControls';
import { useAllSongs } from '@/features/library/hooks/use-all-songs';
import { ALPHABET, firstIndexByLetter } from '@/features/library/alphabet-index';
import { sortTracks, TRACK_SORTS, type SortDirection, type TrackSortKey } from '@/features/library/list-sort';
import { retryAfterEstimate } from '@/features/library/scroll-to-index';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';
import * as PlaybackController from '@/player/PlaybackController';

const ALL_LETTERS: ReadonlySet<string> = new Set(ALPHABET);

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

  // The rail follows a title sort. Rows arrive in the server's order, so a letter's first row is only
  // known once every page is in: choosing a letter loads the rest, then scrolls.
  const listRef = useRef<FlatList<Track>>(null);
  const targetIndex = useRef(0);
  const pendingLetter = useRef<string | null>(null);
  const starts = useMemo(
    () => (sort === 'title' ? firstIndexByLetter(tracks, (track) => track.title) : null),
    [tracks, sort],
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = songsQuery;

  // Fetch pages until none are left, then scroll to the pending letter. Runs on the choice and again
  // as each page lands.
  const settle = () => {
    const letter = pendingLetter.current;
    if (letter === null || isFetchingNextPage) return;
    if (hasNextPage) {
      fetchNextPage();
      return;
    }
    pendingLetter.current = null;
    const index = starts?.get(letter);
    if (index !== undefined) {
      targetIndex.current = index;
      listRef.current?.scrollToIndex({ index, animated: false });
    }
  };
  // No dependency list: it is a no-op unless a letter is pending, and it must see each page land.
  useEffect(settle);

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
          <View style={styles.listWrap}>
            <FlatList<Track>
              ref={listRef}
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
              onScrollToIndexFailed={(info) =>
                retryAfterEstimate(
                  info,
                  (offset) => listRef.current?.scrollToOffset({ offset, animated: false }),
                  () => listRef.current?.scrollToIndex({ index: targetIndex.current, animated: false }),
                )
              }
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
            {starts ? (
              <AlphabetIndex
                available={hasNextPage ? ALL_LETTERS : new Set(starts.keys())}
                onSelect={(letter) => {
                  pendingLetter.current = letter;
                  settle();
                }}
              />
            ) : null}
          </View>
        )}
      </QueryState>
      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    flex: 1,
  },
});
