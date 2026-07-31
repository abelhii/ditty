import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { AlbumShelf } from '@/features/home/components/AlbumShelf';
import { homeShelves } from '@/features/home/shelves';

/**
 * The Home tab's discover surface (Build Order step 9), replacing the old redirect-to-Artists.
 * Faceted browse: a vertical scroll of horizontal album carousels (Recently Added / New Releases /
 * Explore), above quick links into the full catalog lists (Artists / Genres, which live under
 * `/library/artists`). Deliberately query-less — text search is the Search tab's job.
 */
export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Injected once per mount so New Releases' year window is stable across re-renders.
  const shelves = useMemo(() => homeShelves(new Date().getFullYear()), []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
            gap: Spacing.five,
          }}>
          <ThemedText type="title" style={styles.title}>
            Home
          </ThemedText>

          <ThemedView style={styles.browse}>
            <BrowseLink label="Artists" onPress={() => router.push('/library/artists')} />
            <BrowseLink label="Genres" onPress={() => router.push('/library/artists?view=genres')} />
          </ThemedView>

          {shelves.map((shelf) => (
            <AlbumShelf key={shelf.id} shelf={shelf} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BrowseLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.link, pressed && styles.pressed]} onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.linkInner}>
        <ThemedText type="smallBold">{label}</ThemedText>
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
  },
  browse: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  link: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  linkInner: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
});
