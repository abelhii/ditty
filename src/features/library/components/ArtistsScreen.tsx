import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import type { Artist, ArtistSection } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { ArtistRow } from '@/components/ArtistRow';
import { GenreRow } from '@/components/GenreRow';
import { QueryState } from '@/components/QueryState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useArtistSections } from '@/features/library/hooks/use-artist-sections';
import { useGenres } from '@/features/library/hooks/use-genres';

type LibraryView = 'artists' | 'genres';

/** The catalog list — a sectioned (A-Z) artist list, with a Genres view reachable via a segmented
 *  toggle (Build Order step 5). Pushed from Home at `/library/artists`; `initialView` lets Home's
 *  Genres quick link open straight on the Genres tab (Build Order step 9). */
export function ArtistsScreen({ initialView = 'artists' }: { initialView?: LibraryView } = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const credentials = useAuthStore((state) => state.credentials);
  const [view, setView] = useState<LibraryView>(initialView);

  const artistSectionsQuery = useArtistSections();
  const genresQuery = useGenres();

  const listContentStyle = {
    paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Library
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.segmented}>
          <SegmentButton label="Artists" active={view === 'artists'} onPress={() => setView('artists')} />
          <SegmentButton label="Genres" active={view === 'genres'} onPress={() => setView('genres')} />
        </ThemedView>

        {view === 'artists' ? (
          <QueryState
            query={artistSectionsQuery}
            isEmpty={(sections) => sections.every((section) => section.artists.length === 0)}
            emptyMessage="No artists found.">
            {(sections) => (
              <SectionList<Artist, { title: string; data: Artist[] }>
                sections={toListSections(sections)}
                keyExtractor={(artist) => artist.id}
                renderItem={({ item }) =>
                  credentials ? (
                    <ArtistRow
                      artist={item}
                      coverArtUri={getCoverArtUrl(
                        credentials.serverUrl,
                        item.coverArtId,
                        credentials,
                        CoverArtSize.list,
                      )}
                      onPress={() => router.push(`/library/artist/${item.id}`)}
                    />
                  ) : null
                }
                renderSectionHeader={({ section }) => (
                  <ThemedView style={styles.sectionHeader}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {section.title}
                    </ThemedText>
                  </ThemedView>
                )}
                stickySectionHeadersEnabled
                contentContainerStyle={listContentStyle}
                refreshing={artistSectionsQuery.isFetching}
                onRefresh={() => artistSectionsQuery.refetch()}
              />
            )}
          </QueryState>
        ) : (
          <QueryState query={genresQuery} isEmpty={(genres) => genres.length === 0} emptyMessage="No genres found.">
            {(genres) => (
              <FlatList
                data={genres}
                keyExtractor={(genre) => genre.name}
                renderItem={({ item }) => (
                  <GenreRow
                    genre={item}
                    onPress={() => router.push(`/library/genre/${encodeURIComponent(item.name)}`)}
                  />
                )}
                contentContainerStyle={listContentStyle}
                refreshing={genresQuery.isFetching}
                onRefresh={() => genresQuery.refetch()}
              />
            )}
          </QueryState>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function toListSections(sections: ArtistSection[]) {
  return sections
    .filter((section) => section.artists.length > 0)
    .map((section) => ({ title: section.letter, data: section.artists }));
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.segmentButton, pressed && styles.pressed]}
      onPress={onPress}>
      <ThemedView type={active ? 'backgroundSelected' : undefined} style={styles.segmentButtonInner}>
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
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
  segmented: {
    flexDirection: 'row',
    margin: Spacing.four,
    borderRadius: Spacing.three,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  segmentButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  segmentButtonInner: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
});
