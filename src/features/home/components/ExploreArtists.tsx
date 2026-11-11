import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { Artist } from '@/api/types';
import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { AlbumGridGap } from '@/components/album-grid';
import { CoverArtImage } from '@/components/CoverArtImage';
import { ThemedText } from '@/components/ThemedText';
import { Radius, Spacing } from '@/constants/theme';
import { Carousel } from '@/features/home/components/Carousel';
import { sampleArtists } from '@/features/home/wide-grid';
import { useArtistSections } from '@/features/library/hooks/use-artist-sections';

/** How many random artists the shelf holds to scroll through. */
const SHELF_ARTIST_COUNT = 20;

type ExploreArtistsProps = {
  tileWidth: number;
};

/** The wide Home's "Explore artists" carousel: a random pick of circular artist avatars. The pick
 *  is re-drawn only on load and when refresh is pressed, so it doesn't reshuffle on re-render.
 *  Renders nothing until artists load. */
export function ExploreArtists({ tileWidth }: ExploreArtistsProps) {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const sections = useArtistSections().data;
  const allArtists = useMemo(() => sections?.flatMap((section) => section.artists) ?? [], [sections]);
  const [shuffleKey, setShuffleKey] = useState(0);
  const artists = useMemo(
    () => sampleArtists(allArtists, SHELF_ARTIST_COUNT, Math.random),
    // `shuffleKey` is the refresh button re-drawing the pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allArtists, shuffleKey],
  );

  if (!credentials) return null;

  return (
    <Carousel<Artist>
      title="Explore artists"
      data={artists}
      loadingHeight={tileWidth}
      gap={AlbumGridGap}
      keyExtractor={(artist) => artist.id}
      onRefresh={() => setShuffleKey((key) => key + 1)}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/home/artist/${item.id}`)}
          style={({ pressed }) => [{ width: tileWidth }, styles.tile, pressed && styles.pressed]}>
          <CoverArtImage
            uri={getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.grid)}
            style={{ width: tileWidth, height: tileWidth, borderRadius: Radius.pill }}
            iconSize={32}
          />
          <ThemedText type="small" numberOfLines={1} style={styles.name}>
            {item.name}
          </ThemedText>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
