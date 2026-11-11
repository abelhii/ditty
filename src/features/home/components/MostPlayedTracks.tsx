import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { Track } from '@/api/types';
import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { TrackRow } from '@/components/TrackRow';
import { Spacing } from '@/constants/theme';
import { useMostPlayedTracks } from '@/features/home/hooks/use-most-played-tracks';
import type { Shelf } from '@/features/home/shelves';
import * as PlaybackController from '@/player/PlaybackController';

type MostPlayedTracksProps = {
  /** The Frequently played shelf, whose albums are searched for the most played Tracks. */
  shelf: Shelf;
};

/**
 * The "Most played" list: Tracks ranked by play count. Tapping a row replaces the queue with the
 * list, starting at that Track. Renders nothing until there is play history.
 */
export function MostPlayedTracks({ shelf }: MostPlayedTracksProps) {
  const credentials = useAuthStore((state) => state.credentials);
  const tracks = useMostPlayedTracks(shelf);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  if (!credentials || tracks.length === 0) return null;

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="defaultBold" style={styles.title}>
        Most played
      </ThemedText>
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
  title: {
    paddingHorizontal: Spacing.four,
  },
});
