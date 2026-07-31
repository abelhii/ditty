import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
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
import type { Album, Artist, Track } from "@/api/types";
import { useAuthStore } from "@/auth/useAuthStore";
import { AlbumTile } from "@/components/AlbumTile";
import { ArtistRow } from "@/components/ArtistRow";
import { QueryState } from "@/components/QueryState";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { TrackActionsMenu } from "@/components/TrackActionsMenu";
import { TrackRow } from "@/components/TrackRow";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useRecentSearches } from "@/features/search/hooks/useRecentSearches";
import { useSearch } from "@/features/search/hooks/useSearch";
import { useTheme } from "@/hooks/useTheme";
import * as PlaybackController from "@/player/PlaybackController";
import { getCurrentTrack } from "@/player/QueueManager";
import { usePlayerStore } from "@/player/usePlayerStore";

const GRID_COLUMNS = 2;
const GRID_GAP = Spacing.four;

/** The Search tab (Build Order step 6): a debounced text search over `search3`, rendered as one
 *  combined sectioned scroll (artists / albums / songs). An empty box shows Recent Searches; a song
 *  tap plays now without destroying the queue; artist/album taps drill into the shared detail
 *  screens, staying inside the Search tab via their `basePath`. */
export function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const credentials = useAuthStore((state) => state.credentials);
  const currentTrack = getCurrentTrack(usePlayerStore((state) => state.queue));

  const [input, setInput] = useState("");
  const { query, term, isActive } = useSearch(input);
  const recent = useRecentSearches();
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.four * 2;
  const tileWidth =
    (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  const coverUri = (coverArtId: string | undefined, size: number) =>
    credentials
      ? getCoverArtUrl(credentials.serverUrl, coverArtId, credentials, size)
      : undefined;

  const contentPadding = {
    paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
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
  const playSong = (song: Track) => {
    recent.add(term);
    PlaybackController.playNow(song);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
            <Pressable hitSlop={12} onPress={() => setInput("")}>
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

        {isActive ? (
          <QueryState
            query={query}
            isEmpty={(r) =>
              r.artists.length === 0 &&
              r.albums.length === 0 &&
              r.tracks.length === 0
            }
            emptyMessage={`No results for "${term}".`}
          >
            {({ artists, albums, tracks }) => (
              <ScrollView
                contentContainerStyle={contentPadding}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {artists.length > 0 && (
                  <>
                    <SectionHeader label="Artists" />
                    {artists.map((artist) => (
                      <ArtistRow
                        key={artist.id}
                        artist={artist}
                        coverArtUri={coverUri(
                          artist.coverArtId,
                          CoverArtSize.list,
                        )}
                        onPress={() => openArtist(artist)}
                      />
                    ))}
                  </>
                )}

                {tracks.length > 0 && (
                  <>
                    <SectionHeader label="Songs" />
                    {tracks.map((track) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        coverArtUri={coverUri(
                          track.coverArtId,
                          CoverArtSize.list,
                        )}
                        isPlaying={currentTrack?.id === track.id}
                        onPress={() => playSong(track)}
                        onOverflowPress={() => setMenuTrack(track)}
                      />
                    ))}
                  </>
                )}

                {albums.length > 0 && (
                  <>
                    <SectionHeader label="Albums" />
                    <ThemedView style={styles.albumGrid}>
                      {albums.map((album) => (
                        <AlbumTile
                          key={album.id}
                          album={album}
                          width={tileWidth}
                          coverArtUri={coverUri(
                            album.coverArtId,
                            CoverArtSize.list,
                          )}
                          onPress={() => openAlbum(album)}
                        />
                      ))}
                    </ThemedView>
                  </>
                )}
              </ScrollView>
            )}
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
        <Pressable hitSlop={8} onPress={onClear}>
          <ThemedText type="small" themeColor="textSecondary">
            Clear
          </ThemedText>
        </Pressable>
      </ThemedView>
      {recents.map((recentTerm) => (
        <Pressable
          key={recentTerm}
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
          <Pressable hitSlop={12} onPress={() => onRemove(recentTerm)}>
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
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
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
