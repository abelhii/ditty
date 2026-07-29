import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import * as QueueManager from '@/player/QueueManager';
import type { RepeatMode } from '@/player/QueueManager';
import { usePlayerStore } from '@/player/usePlayerStore';

/**
 * The public API for playback — called by the UI and by NotificationBridge, never by
 * AudioEngine directly. Every function here only writes proposed state into
 * `usePlayerStore`; AudioEngine reacts to it and writes back what actually happened.
 * See docs/adr/0001-player-state-flows-through-store.md.
 */

function currentQueue(): QueueManager.QueueState {
  return usePlayerStore.getState().queue;
}

/** Replaces the queue and starts playback at `startIndex`. */
export function play(tracks: Track[], startIndex = 0): void {
  const queue = QueueManager.createQueueState(tracks, startIndex);
  usePlayerStore.setState({ queue, desiredPlaying: tracks.length > 0 });
}

/**
 * Plays `track` now *without destroying an existing queue* — search's exploratory song tap, as
 * opposed to album detail's queue-replacing `play` (rationale: docs/adr/0004-search-tap-preserves-queue.md).
 * - Queue already playing → insert at the current position and play immediately; the previously-
 *   playing track becomes next, the rest of the queue preserved.
 * - No queue → start one from the tapped song's album (a richer queue than a lone track), falling
 *   back to the single track if the album can't be fetched (offline / not cached).
 */
export async function playNow(track: Track): Promise<void> {
  const queue = currentQueue();
  if (QueueManager.getCurrentTrack(queue)) {
    usePlayerStore.setState({ queue: QueueManager.playNow(queue, track), desiredPlaying: true });
    return;
  }

  const tracks = await albumTracksFor(track);
  const startIndex = Math.max(
    0,
    tracks.findIndex((t) => t.id === track.id),
  );
  play(tracks, startIndex);
}

/** The tapped song's album tracks, or just the song itself if there's no album id or the fetch
 *  fails (offline / album not cached). */
async function albumTracksFor(track: Track): Promise<Track[]> {
  const credentials = useAuthStore.getState().credentials;
  if (!credentials || !track.albumId) return [track];

  try {
    const { tracks } = await getAlbum(credentials.serverUrl, credentials, track.albumId);
    return tracks.length > 0 ? tracks : [track];
  } catch {
    return [track];
  }
}

export function togglePlayPause(): void {
  const { desiredPlaying, queue } = usePlayerStore.getState();
  if (!QueueManager.getCurrentTrack(queue)) return;
  usePlayerStore.setState({ desiredPlaying: !desiredPlaying });
}

export function pause(): void {
  usePlayerStore.setState({ desiredPlaying: false });
}

export function resume(): void {
  if (!QueueManager.getCurrentTrack(currentQueue())) return;
  usePlayerStore.setState({ desiredPlaying: true });
}

export function skipNext(): void {
  const queue = QueueManager.next(currentQueue());
  usePlayerStore.setState({
    queue,
    desiredPlaying: QueueManager.getCurrentTrack(queue) !== undefined,
  });
}

/** Jumps to an existing track in the current queue and plays it — the queue view's tap-to-jump.
 *  Unlike `play`, the queue itself is left intact (see QueueManager.jumpTo). */
export function jumpTo(index: number): void {
  const queue = QueueManager.jumpTo(currentQueue(), index);
  usePlayerStore.setState({
    queue,
    desiredPlaying: QueueManager.getCurrentTrack(queue) !== undefined,
  });
}

export function skipPrevious(): void {
  usePlayerStore.setState({ queue: QueueManager.previous(currentQueue()) });
}

export function seekTo(seconds: number): void {
  usePlayerStore.getState().requestSeek(seconds);
}

export function setShuffle(enabled: boolean): void {
  usePlayerStore.setState({ queue: QueueManager.setShuffle(currentQueue(), enabled) });
}

export function setRepeat(mode: RepeatMode): void {
  usePlayerStore.setState({ queue: QueueManager.setRepeat(currentQueue(), mode) });
}

export function addToQueue(track: Track): void {
  usePlayerStore.setState({ queue: QueueManager.enqueue(currentQueue(), track) });
}

export function playNext(track: Track): void {
  usePlayerStore.setState({ queue: QueueManager.playNext(currentQueue(), track) });
}

export function removeFromQueue(index: number): void {
  usePlayerStore.setState({ queue: QueueManager.removeAt(currentQueue(), index) });
}

export function reorderQueue(fromIndex: number, toIndex: number): void {
  usePlayerStore.setState({ queue: QueueManager.reorder(currentQueue(), fromIndex, toIndex) });
}

/** Called by AudioEngine when the current track finishes naturally. Routes through the same
 *  entry point as a UI/notification skip so nothing needs special-case "track ended" logic. */
export function handleTrackEnded(): void {
  skipNext();
}
