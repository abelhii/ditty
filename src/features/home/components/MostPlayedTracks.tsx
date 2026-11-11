import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { Spacing } from '@/constants/theme';
import { useMostPlayedTracks } from '@/features/home/hooks/use-most-played-tracks';
import { MOST_PLAYED_HOME } from '@/features/home/most-played';
import type { Shelf } from '@/features/home/shelves';
import * as PlaybackController from '@/player/PlaybackController';

type MostPlayedTracksProps = {
  /** The Frequently played shelf, whose albums are searched for the most played Tracks. */
  shelf: Shelf;
};

/**
 * The "Most played" list on Home: the top few Tracks by play count, with a "View more" link to the
 * full list. Tapping a row replaces the queue with the shown list, starting at that Track. Renders
 * nothing until there is play history.
 */
export function MostPlayedTracks({ shelf }: MostPlayedTracksProps) {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { tracks } = useMostPlayedTracks(shelf, MOST_PLAYED_HOME);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  if (!credentials || tracks.length === 0) return null;

  return (
    <ThemedView style={styles.section}>
      <ThemedView style={styles.header}>
        <ThemedText type="defaultBold">Most played</ThemedText>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/home/most-played')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="smallBold" themeColor="accent">
            View more
          </ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedView>
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            coverArtUri={getCoverArtUrl(credentials.serverUrl, track.coverArtId, credentials, CoverArtSize.list)}
            detail={`${track.playCount} ${track.playCount === 1 ? 'play' : 'plays'}`}
            onPress={() => PlaybackController.play(tracks, index)}
            onOverflowPress={() => setMenuTrack(track)}
          />
        ))}
      </ThemedView>
      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
});
