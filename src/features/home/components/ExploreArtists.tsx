import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import { sampleArtists } from '@/features/home/wide-grid';
import { AlbumGridGap } from '@/components/album-grid';
import { useArtistSections } from '@/features/library/hooks/use-artist-sections';

type ExploreArtistsProps = {
  /** How many artists to show (one row of the wide Home grid). */
  count: number;
  tileWidth: number;
};

/** The wide Home's "Explore artists" shelf: a random row of circular artist avatars. The pick is
 *  made once per mount so it doesn't reshuffle on re-render. Renders nothing until artists load. */
export function ExploreArtists({ count, tileWidth }: ExploreArtistsProps) {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const sections = useArtistSections().data;
  const allArtists = useMemo(() => sections?.flatMap((section) => section.artists) ?? [], [sections]);
  // Re-sampled only when the artist list itself changes (first load), not when `count` reflows.
  const shuffled = useMemo(() => sampleArtists(allArtists, allArtists.length, Math.random), [allArtists]);
  const artists = shuffled.slice(0, count);

  if (!credentials || artists.length === 0) return null;

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="defaultBold" style={styles.title}>
        Explore artists
      </ThemedText>
      <ThemedView style={styles.row}>
        {artists.map((artist) => (
          <Pressable
            key={artist.id}
            accessibilityRole="link"
            onPress={() => router.push(`/home/artist/${artist.id}`)}
            style={({ pressed }) => [{ width: tileWidth }, styles.tile, pressed && styles.pressed]}>
            <CoverArtImage
              uri={getCoverArtUrl(credentials.serverUrl, artist.coverArtId, credentials, CoverArtSize.grid)}
              style={{ width: tileWidth, height: tileWidth, borderRadius: Radius.pill }}
              iconSize={32}
            />
            <ThemedText type="small" numberOfLines={1} style={styles.name}>
              {artist.name}
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  title: {
    paddingHorizontal: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: AlbumGridGap,
    paddingHorizontal: Spacing.four,
  },
  tile: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  name: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
