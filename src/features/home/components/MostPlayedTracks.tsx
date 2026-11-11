import { useState } from 'react';
import { View } from 'react-native';

import type { Track } from '@/api/types';
import { CoverArtSize, getCoverArtUrl } from '@/api/subsonic/endpoints/media';
import { useAuthStore } from '@/auth/use-auth-store';
import { TrackActionsMenu } from '@/components/TrackActionsMenu';
import { Carousel } from '@/features/home/components/Carousel';
import { TrackTile } from '@/features/home/components/TrackTile';
import { useMostPlayedTracks } from '@/features/home/hooks/use-most-played-tracks';
import type { Shelf } from '@/features/home/shelves';
import * as PlaybackController from '@/player/PlaybackController';

const TILE_WIDTH = 96;

type MostPlayedTracksProps = {
  /** The Frequently played shelf, whose albums are searched for the most played Tracks. */
  shelf: Shelf;
};

/**
 * The "Most played" carousel: songs ranked by play count, as a horizontal list with scroll and
 * refresh controls. Tapping a tile replaces the queue with the list, starting at that Track;
 * long-press opens the Track's actions. Renders nothing until there is play history.
 */
export function MostPlayedTracks({ shelf }: MostPlayedTracksProps) {
  const credentials = useAuthStore((state) => state.credentials);
  const { tracks, refresh, refreshing } = useMostPlayedTracks(shelf);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  if (!credentials || tracks.length === 0) return null;

  return (
    <View>
      <Carousel<Track>
        title="Most played"
        data={tracks}
        loadingHeight={TILE_WIDTH}
        keyExtractor={(track) => track.id}
        onRefresh={() => void refresh()}
        refreshing={refreshing}
        renderItem={({ item, index }) => (
          <TrackTile
            track={item}
            width={TILE_WIDTH}
            coverArtUri={getCoverArtUrl(credentials.serverUrl, item.coverArtId, credentials, CoverArtSize.list)}
            detail={`${item.playCount} ${item.playCount === 1 ? 'play' : 'plays'}`}
            onPress={() => PlaybackController.play(tracks, index)}
            onLongPress={() => setMenuTrack(item)}
          />
        )}
      />
      <TrackActionsMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </View>
  );
}
