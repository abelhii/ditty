import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CoverArtSize, getCoverArtUrl } from "@/api/subsonic/endpoints/media";
import type { Album, Artist, Playlist, Track } from "@/api/types";
import { useAuthStore } from "@/auth/use-auth-store";
import { albumGridLayout, AlbumGridGap } from "@/components/album-grid";
import { AlbumTile } from "@/components/AlbumTile";
import { ArtistRow } from "@/components/ArtistRow";
import { EmptyMessage } from "@/components/EmptyMessage";
import { FilterChip } from "@/components/FilterChip";
import { QueryState } from "@/components/QueryState";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WideTopBar } from "@/components/WideTopBar";
import { TrackActionsMenu } from "@/components/TrackActionsMenu";
import { TrackRow } from "@/components/TrackRow";
import { MaxContentWidth, Radius, Spacing, WideMaxContentWidth } from "@/constants/theme";
import { usePlaylists } from "@/features/playlists/hooks/use-playlists";
import { SearchResultRow } from "@/features/search/components/SearchResultRow";
import { useRecentSearches } from "@/features/search/hooks/use-recent-searches";
import { useSearch } from "@/features/search/hooks/use-search";
import {
  filterPlaylistsByName,
  formatResultCount,
  resultCount,
  songCountLabel,
  type SearchFilter,
} from "@/features/search/search-filters";
import { useIsWideLayout } from "@/hooks/use-is-wide-layout";
import { useTheme } from "@/hooks/use-theme";
import * as PlaybackController from "@/player/PlaybackController";
import { useListBottomInset } from "@/hooks/use-list-bottom-inset";

/** The Search tab (Build Order step 6): a debounced text search over `search3` plus a client-side
 *  name match over Playlists, rendered as one sectioned scroll behind All / Songs / Artists /
 *  Albums / Playlists filter chips with a result count. An empty box shows Recent Searches; a song
 *  tap plays now without destroying the queue; artist/album/playlist taps drill into the detail
 *  screens, staying inside the Search tab via their `basePath`. */
export function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listBottomInset = useListBottomInset();
  const theme = useTheme();
  const wide = useIsWideLayout();
  const { width, scale } = useWindowDimensions();
  const credentials = useAuthStore((state) => state.credentials);

  const [input, setInput] = useState("");
  const { query, term, isActive } = useSearch(input);
  const recent = useRecentSearches();
  const playlists = usePlaylists().data;
  const playlistMatches = useMemo(
    () => (playlists ? filterPlaylistsByName(playlists, term) : []),
    [playlists, term],
  );
  // Selection resets to All whenever the settled term changes (adjusted during render, not in an
  // effect, so a stale chip never paints against the new results).
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [filterTerm, setFilterTerm] = useState(term);
  if (filterTerm !== term) {
    setFilterTerm(term);
    setFilter("all");
  }
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const { tileWidth, coverArtSize } = albumGridLayout(width, scale, wide);

  const coverUri = (coverArtId: string | undefined, size: number) =>
    credentials
      ? getCoverArtUrl(credentials.serverUrl, coverArtId, credentials, size)
      : undefined;

  const contentPadding = {
    paddingBottom: insets.bottom + listBottomInset,
  };

  // Recent searches are saved on result tap (not per keystroke), so we only ever persist terms the
  // user acted on rather than every prefix fragment they typed.
  const openArtist = (artist: Artist) => {
    recent.add(term);
    router.push(`/search/artist/${artist.id}`);
  };
  const openAlbum = (album: Album) => {
    recent.add(term);
    router.push(`/search/album/${album.id}`);
  };
  const openPlaylist = (playlist: Playlist) => {
    recent.add(term);
    router.push(`/search/playlist/${playlist.id}`);
  };
  const playSong = (song: Track) => {
    recent.add(term);
    PlaybackController.playNow(song);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, wide && styles.safeAreaWide]}
        edges={["top", "left", "right"]}
      >
        {wide ? (
          // On wide, search has no tab: Home's top bar opens this screen, and Escape or clearing
          // the field returns to Home.
          <ThemedView style={styles.wideBar}>
            <WideTopBar
              value={input}
              onChangeText={setInput}
              autoFocus
              onEscape={() => router.navigate("/home")}
              onClear={() => {
                setInput("");
                router.navigate("/home");
              }}
            />
          </ThemedView>
        ) : (
          <>
        <ThemedText type="title" style={styles.title}>
          Search
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.inputRow}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={18}
            tintColor={theme.textSecondary}
          />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Artists, albums, songs"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {input.length > 0 && (
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setInput("")}
            >
              <SymbolView
                name={{
                  ios: "xmark.circle.fill",
                  android: "cancel",
                  web: "cancel",
                }}
                size={18}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          )}
        </ThemedView>
          </>
        )}

        {isActive ? (
          <QueryState
            query={query}
            isEmpty={(r) =>
              r.artists.length === 0 &&
              r.albums.length === 0 &&
              r.tracks.length === 0 &&
              playlistMatches.length === 0
            }
            emptyMessage={`No results for "${term}".`}
          >
            {({ artists, albums, tracks }) => {
              const counts = {
                songs: tracks.length,
                artists: artists.length,
                albums: albums.length,
                playlists: playlistMatches.length,
              };
              const total = resultCount(filter, counts);
              // Type labels ("Song · artist") only make sense in the mixed All list.
              const labelled = filter === "all";
              const show = (type: SearchFilter) =>
                filter === "all" || filter === type;

              return (
                <>
                  <ThemedView style={styles.chips}>
                    {FILTERS.map(({ value, label }) => (
                      <FilterChip
                        key={value}
                        label={label}
                        active={filter === value}
                        onPress={() => setFilter(value)}
                      />
                    ))}
                  </ThemedView>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.count}
                  >
                    {formatResultCount(total)}
                  </ThemedText>
                  <ScrollView
                    contentContainerStyle={contentPadding}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                  >
                    {total === 0 && (
                      <EmptyMessage text={`No results for "${term}" here.`} />
                    )}

                    {show("artists") && artists.length > 0 && (
                      <>
                        <SectionHeader label="Artists" />
                        {artists.map((artist) =>
                          labelled ? (
                            <SearchResultRow
                              key={artist.id}
                              title={artist.name}
                              subtitle="Artist"
                              coverArtUri={coverUri(
                                artist.coverArtId,
                                CoverArtSize.list,
                              )}
                              round
                              onPress={() => openArtist(artist)}
                            />
                          ) : (
                            <ArtistRow
                              key={artist.id}
                              artist={artist}
                              coverArtUri={coverUri(
                                artist.coverArtId,
                                CoverArtSize.list,
                              )}
                              onPress={() => openArtist(artist)}
                            />
                          ),
                        )}
                      </>
                    )}

                    {show("songs") && tracks.length > 0 && (
                      <>
                        <SectionHeader label="Songs" />
                        {tracks.map((track) => (
                          <TrackRow
                            key={track.id}
                            track={track}
                            typeLabel={labelled ? "Song" : undefined}
                            coverArtUri={coverUri(
                              track.coverArtId,
                              CoverArtSize.list,
                            )}
                            onPress={() => playSong(track)}
                            onOverflowPress={() => setMenuTrack(track)}
                          />
                        ))}
                      </>
                    )}

                    {show("albums") && albums.length > 0 && (
                      <>
                        <SectionHeader label="Albums" />
                        {labelled ? (
                          albums.map((album) => (
                            <SearchResultRow
                              key={album.id}
                              title={album.name}
                              subtitle={`Album · ${album.artist}`}
                              coverArtUri={coverUri(
                                album.coverArtId,
                                CoverArtSize.list,
                              )}
                              onPress={() => openAlbum(album)}
                            />
                          ))
                        ) : (
                          <ThemedView style={styles.albumGrid}>
                            {albums.map((album) => (
                              <AlbumTile
                                key={album.id}
                                album={album}
                                width={tileWidth}
                                coverArtUri={coverUri(
                                  album.coverArtId,
                                  coverArtSize,
                                )}
                                onPress={() => openAlbum(album)}
                              />
                            ))}
                          </ThemedView>
                        )}
                      </>
                    )}

                    {show("playlists") && playlistMatches.length > 0 && (
                      <>
                        <SectionHeader label="Playlists" />
                        {playlistMatches.map((playlist) => (
                          <SearchResultRow
                            key={playlist.id}
                            title={playlist.name}
                            subtitle={`Playlist · ${songCountLabel(playlist.songCount)}`}
                            coverArtUri={coverUri(
                              playlist.coverArtId,
                              CoverArtSize.list,
                            )}
                            onPress={() => openPlaylist(playlist)}
                          />
                        ))}
                      </>
                    )}
                  </ScrollView>
                </>
              );
            }}
          </QueryState>
        ) : (
          <RecentSearches
            recents={recent.recents}
            contentStyle={contentPadding}
            onRerun={setInput}
            onRemove={recent.remove}
            onClear={recent.clear}
          />
        )}

        <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
      </SafeAreaView>
    </ThemedView>
  );
}

function RecentSearches({
  recents,
  contentStyle,
  onRerun,
  onRemove,
  onClear,
}: {
  recents: string[];
  contentStyle: { paddingBottom: number };
  onRerun: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}) {
  const theme = useTheme();

  if (recents.length === 0) {
    return (
      <ThemedView style={styles.emptyHint}>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.centerText}
        >
          Search for artists, albums, and songs.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.recentHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Recent
        </ThemedText>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onClear}>
          <ThemedText type="small" themeColor="textSecondary">
            Clear
          </ThemedText>
        </Pressable>
      </ThemedView>
      {recents.map((recentTerm) => (
        <Pressable
          key={recentTerm}
          accessibilityRole="button"
          style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
          onPress={() => onRerun(recentTerm)}
        >
          <SymbolView
            name={{ ios: "clock", android: "schedule", web: "schedule" }}
            size={16}
            tintColor={theme.textSecondary}
          />
          <ThemedText style={styles.recentText} numberOfLines={1}>
            {recentTerm}
          </ThemedText>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${recentTerm} from recent searches`}
            onPress={() => onRemove(recentTerm)}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={16}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <ThemedView style={styles.sectionHeader}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const FILTERS: { value: SearchFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "songs", label: "Songs" },
  { value: "artists", label: "Artists" },
  { value: "albums", label: "Albums" },
  { value: "playlists", label: "Playlists" },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  safeAreaWide: {
    maxWidth: WideMaxContentWidth,
  },
  wideBar: {
    paddingBottom: Spacing.three,
  },
  title: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  count: {
    paddingHorizontal: Spacing.four,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AlbumGridGap,
    paddingHorizontal: Spacing.four,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  recentText: {
    flex: 1,
  },
  emptyHint: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  centerText: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
