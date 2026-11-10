import { useEffect, useRef } from 'react';

import { queryClient } from '@/api/query-client';
import { queryKeys } from '@/api/query-keys';
import { scrobble } from '@/api/subsonic/endpoints/annotations';
import { useAuthStore } from '@/auth/use-auth-store';
import { getCurrentTrack } from '@/player/QueueManager';
import { advanceScrobbleTracker, createScrobbleTracker } from '@/player/scrobble-tracker';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { usePlayerStore } from '@/player/use-player-store';

/**
 * Reports plays to the server so Home's play-based shelves (Frequently played) see this app's
 * listening. Reads only the observed playback state (it never touches the player, ADR 0001); the
 * decision of when a play counts lives in the pure `scrobble-tracker`. Mount once next to
 * `AudioEngine`. Failures are dropped: scrobbling must never interrupt playback, and offline
 * queueing is out of scope.
 */
export function ScrobbleReporter() {
  const credentials = useAuthStore((state) => state.credentials);
  const track = usePlayerStore((state) => getCurrentTrack(state.queue));
  const status = usePlaybackStatusStore((state) => state.status);
  const position = usePlaybackStatusStore((state) => state.position);
  const tracker = useRef(createScrobbleTracker());

  useEffect(() => {
    if (!credentials || !track) return;

    const { state, action } = advanceScrobbleTracker(tracker.current, {
      trackId: track.id,
      duration: track.duration,
      position,
      playing: status === 'playing',
      now: Date.now(),
    });
    tracker.current = state;
    if (!action) return;

    const submission = action === 'submit';
    scrobble(credentials.serverUrl, credentials, track.id, state.startedAt, submission)
      .then(() => {
        if (submission) {
          queryClient.invalidateQueries({ queryKey: queryKeys.albumShelf('frequentlyPlayed') });
        }
      })
      .catch(() => {});
    // `track` is keyed by id; position/status are the ticks that drive the tracker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, track?.id, status, position]);

  return null;
}
