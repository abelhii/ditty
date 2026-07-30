import { getCurrentTrack } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/usePlaybackStatusStore';
import { usePlayerStore } from '@/player/usePlayerStore';

export type Progress = {
  /** Current playback position in seconds, as reported by AudioEngine. */
  position: number;
  /** The current track's total length in seconds (0 when nothing is loaded). */
  duration: number;
  /** `position / duration`, clamped to 0–1 — the scrubber's fill fraction. */
  fraction: number;
};

/** Playback progress for the scrubber: live position from the store, duration from the current
 *  track. Position is the only value that ticks frequently, so subscribing here (rather than
 *  reading the whole store) keeps re-renders scoped to the scrubber. */
export function useProgress(): Progress {
  const position = usePlaybackStatusStore((state) => state.position);
  const duration = usePlayerStore((state) => getCurrentTrack(state.queue)?.duration ?? 0);

  const fraction = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;
  return { position, duration, fraction };
}

/** `m:ss` for a duration/position in seconds — matches TrackRow's formatting. */
export function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
