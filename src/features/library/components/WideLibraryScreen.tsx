import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { QueryState } from '@/components/QueryState';
import { TextPromptModal } from '@/components/TextPromptModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing, WideContentPadding, WideMaxContentWidth } from '@/constants/theme';
import { useFavourites } from '@/features/favourites/hooks/use-favourites';
import { AllSongsList } from '@/features/library/components/AllSongsList';
import { useArtistSections } from '@/features/library/hooks/use-artist-sections';
import { useGenres } from '@/features/library/hooks/use-genres';
import {
  albumRows,
  artistRows,
  genreRows,
  likedSongsRow,
  playlistRows,
  type LibraryRow,
} from '@/features/library/library-rows';
import { useCreatePlaylist } from '@/features/playlists/hooks/use-create-playlist';
import { usePlaylists } from '@/features/playlists/hooks/use-playlists';
import { useListBottomInset } from '@/hooks/use-list-bottom-inset';
import { useTheme } from '@/hooks/use-theme';

type LibraryFilter = 'allSongs' | 'playlists' | 'albums' | 'artists' | 'allArtists' | 'genres';

const FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: 'allSongs', label: 'All songs' },
  { value: 'playlists', label: 'Playlists' },
  { value: 'albums', label: 'Albums' },
  { value: 'artists', label: 'Artists' },
  { value: 'allArtists', label: 'All artists' },
  { value: 'genres', label: 'Genres' },
];

/** The wide-layout Library: one table over the user's playlists, liked albums and artists, plus the
 *  server catalog's artists and genres, behind filter pills. Wide only; narrow keeps the catalog
 *  list and reaches My Music from Home. */
export function WideLibraryScreen() {
  const theme = useTheme();
  const createPlaylist = useCreatePlaylist();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<LibraryFilter>('allSongs');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.titleRow}>
          <ThemedText type="title">Library</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCreating(true)}
            style={({ pressed }) => [
              styles.newPlaylist,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              + New playlist
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.pills}>
          {FILTERS.map((option) => (
            <FilterPill
              key={option.value}
              label={option.label}
              active={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </ThemedView>

        <FilterTable filter={filter} />
      </SafeAreaView>

      <TextPromptModal
        visible={creating}
        title="New playlist"
        placeholder="Playlist name"
        submitLabel="Create"
        onSubmit={(name) => {
          createPlaylist.mutate(name);
          setCreating(false);
        }}
        onClose={() => setCreating(false)}
      />
    </ThemedView>
  );
}

/** Each filter owns its query, so only the one on screen is fetched. */
function FilterTable({ filter }: { filter: LibraryFilter }) {
  switch (filter) {
    case 'allSongs':
      return <AllSongsList />;
    case 'playlists':
      return <PlaylistsTable />;
    case 'albums':
      return <LikedTable kind="albums" />;
    case 'artists':
      return <LikedTable kind="artists" />;
    case 'allArtists':
      return <AllArtistsTable />;
    case 'genres':
      return <GenresTable />;
  }
}

function PlaylistsTable() {
  const playlistsQuery = usePlaylists();
  const favouritesQuery = useFavourites();
  return (
    <QueryState query={playlistsQuery}>
      {(playlists) => (
        <Table
          rows={[
            likedSongsRow(favouritesQuery.data?.tracks.length),
            ...playlistRows(playlists, new Date()),
          ]}
          refreshing={playlistsQuery.isFetching}
          onRefresh={() => playlistsQuery.refetch()}
        />
      )}
    </QueryState>
  );
}

function LikedTable({ kind }: { kind: 'albums' | 'artists' }) {
  const favouritesQuery = useFavourites();
  return (
    <QueryState query={favouritesQuery}>
      {({ albums, artists }) => (
        <Table
          rows={kind === 'albums' ? albumRows(albums) : artistRows(artists)}
          emptyMessage={kind === 'albums' ? 'No starred albums.' : 'No starred artists.'}
          refreshing={favouritesQuery.isFetching}
          onRefresh={() => favouritesQuery.refetch()}
        />
      )}
    </QueryState>
  );
}

function AllArtistsTable() {
  const sectionsQuery = useArtistSections();
  return (
    <QueryState query={sectionsQuery}>
      {(sections) => (
        <Table
          rows={artistRows(sections.flatMap((section) => section.artists))}
          emptyMessage="No artists found."
          refreshing={sectionsQuery.isFetching}
          onRefresh={() => sectionsQuery.refetch()}
        />
      )}
    </QueryState>
  );
}

function GenresTable() {
  const genresQuery = useGenres();
  return (
    <QueryState query={genresQuery}>
      {(genres) => (
        <Table
          rows={genreRows(genres)}
          emptyMessage="No genres found."
          refreshing={genresQuery.isFetching}
          onRefresh={() => genresQuery.refetch()}
        />
      )}
    </QueryState>
  );
}

type TableProps = {
  rows: LibraryRow[];
  emptyMessage?: string;
  refreshing: boolean;
  onRefresh: () => void;
};

function Table({ rows, emptyMessage, refreshing, onRefresh }: TableProps) {
  const router = useRouter();
  const theme = useTheme();
  const listBottomInset = useListBottomInset();
  const credentials = useAuthStore((state) => state.credentials);

  const coverUri = (row: LibraryRow) =>
    credentials && row.coverArtId
      ? getCoverArtUrl(credentials.serverUrl, row.coverArtId, credentials, CoverArtSize.list)
      : undefined;

  return (
    <FlatList<LibraryRow>
      data={rows}
      keyExtractor={(row) => row.key}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: listBottomInset }}
      ListHeaderComponent={
        <ThemedView style={[styles.row, styles.headerRow, { borderBottomColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.indexCell}>
            #
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.titleCell}>
            Title
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.typeCell}>
            Type
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.songsCell}>
            Songs
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.addedCell}>
            Date added
          </ThemedText>
        </ThemedView>
      }
      ListEmptyComponent={
        emptyMessage ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            {emptyMessage}
          </ThemedText>
        ) : null
      }
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={item.title}
          onPress={() => router.push(item.href as Href)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.indexCell}>
            {index + 1}
          </ThemedText>
          <ThemedView style={[styles.titleCell, styles.titleContent]}>
            {item.liked ? (
              <ThemedView style={[styles.thumb, styles.likedThumb, { backgroundColor: theme.accent }]}>
                <SymbolView
                  name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
                  size={16}
                  tintColor={theme.tint}
                />
              </ThemedView>
            ) : (
              <CoverArtImage uri={coverUri(item)} style={styles.thumb} />
            )}
            <ThemedView style={styles.titleText}>
              <ThemedText type="defaultBold" numberOfLines={1}>
                {item.title}
              </ThemedText>
              {item.subtitle ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {item.subtitle}
                </ThemedText>
              ) : null}
            </ThemedView>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary" style={styles.typeCell}>
            {item.typeLabel}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.songsCell}>
            {item.songCount ?? '—'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.addedCell}>
            {item.added ?? '—'}
          </ThemedText>
        </Pressable>
      )}
    />
  );
}

type FilterPillProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterPill({ label, active, onPress }: FilterPillProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.pill,
        active ? { backgroundColor: theme.accent } : { borderWidth: 1, borderColor: theme.border },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: active ? theme.tint : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const THUMB = 36;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: WideMaxContentWidth,
    paddingHorizontal: WideContentPadding,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  newPlaylist: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pills: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indexCell: {
    width: 28,
    textAlign: 'center',
  },
  titleCell: {
    flex: 1,
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titleText: {
    flex: 1,
  },
  typeCell: {
    width: 120,
  },
  songsCell: {
    width: 90,
  },
  addedCell: {
    width: 130,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.sm,
  },
  likedThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
