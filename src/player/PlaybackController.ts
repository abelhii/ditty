import { getAlbum } from '@/api/subsonic/endpoints/browsing';
import { getRandomSongs, getSimilarSongs2 } from '@/api/subsonic/endpoints/discovery';
import type { Track } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import { showNotice } from '@/components/use-notice-store';
import { isOfflineMode, useOfflineStore } from '@/features/downloads/use-offline-store';
import { useDownloadsStore } from '@/features/downloads/use-downloads-store';
import { BATCH_SIZE, pickNextBatch, REFILL_THRESHOLD } from '@/player/auto-dj';
import { stepToPlayable } from '@/player/offline-skip';
import * as QueueManager from '@/player/QueueManager';
import type { RepeatMode } from '@/player/QueueManager';
import { usePlaybackStatusStore } from '@/player/use-playback-status-store';
import { useAutoDjSettingsStore } from '@/player/use-auto-dj-settings-store';
import { useAutoDjStore } from '@/player/use-auto-dj-store';
import { usePlayerStore } from '@/player/use-player-store';

/**
 * The public API for playback — called by the UI and by NotificationBridge, never by
 * AudioEngine directly. Every function here only writes proposed state into
 * `usePlayerStore`; AudioEngine reacts to it and writes back what actually happened.
 * See docs/adr/0001-player-state-flows-through-store.md.
 */

function currentQueue(): QueueManager.QueueState {
  return usePlayerStore.getState().queue;
}

/** In Offline mode only downloaded Tracks can play; otherwise everything is assumed streamable
 *  (a stream failure is handled by the halt-and-retry path, ADR 0007). */
function isPlayableNow(track: Track): boolean {
  if (!isOfflineMode(useOfflineStore.getState())) return true;
  return useDownloadsStore.getState().downloadedIds[track.id] === true;
}

/** Replaces the queue and starts playback at `startIndex` — or at the next downloaded Track when
 *  Offline mode is on and the requested one isn't. If Offline mode is on and nothing from
 *  `startIndex` onward is downloaded, the existing Queue is left untouched, a Notice explains why,
 *  and this returns `false`. */
export function play(tracks: Track[], startIndex = 0): boolean {
  let queue = QueueManager.createQueueState(tracks, startIndex);
  const start = QueueManager.getCurrentTrack(queue);
  if (start && !isPlayableNow(start)) {
    queue = stepToPlayable(queue, QueueManager.next, isPlayableNow);
    const landed = QueueManager.getCurrentTrack(queue);
    if (!landed || !isPlayableNow(landed)) {
      showNotice("Nothing to play offline — these tracks aren't downloaded.");
      return false;
    }
  }
  usePlayerStore.setState({ queue, desiredPlaying: tracks.length > 0 });
  return true;
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
  const queue = stepToPlayable(currentQueue(), QueueManager.next, isPlayableNow);
  usePlayerStore.setState({
    queue,
    desiredPlaying: QueueManager.getCurrentTrack(queue) !== undefined,
  });
  void autoDjRefillIfLow();
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
  usePlayerStore.setState({
    queue: stepToPlayable(currentQueue(), QueueManager.previous, isPlayableNow),
  });
}

export function seekTo(seconds: number): void {
  usePlayerStore.getState().requestSeek(seconds);
}

/** Retries the current track after a playback error (see the transport's Retry affordance, ADR
 *  0007). Forces AudioEngine to re-fetch the same stream and resume, moving `status` off `'error'`
 *  back to `'loading'`. */
export function retry(): void {
  if (!QueueManager.getCurrentTrack(currentQueue())) return;
  usePlaybackStatusStore.getState().setStatus('loading');
  usePlayerStore.getState().requestReload();
  usePlayerStore.setState({ desiredPlaying: true });
}

/** Sets the output volume (clamped to 0-1). */
export function setVolume(volume: number): void {
  usePlayerStore.getState().setVolume(Math.min(1, Math.max(0, volume)));
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

let refilling = false;
let noticeShown = false;

/** Turns Auto-DJ on or off. Turning it on tops the Queue up immediately if it is running low. */
export function setAutoDj(enabled: boolean): void {
  useAutoDjStore.getState().setEnabled(enabled);
  if (enabled) void autoDjRefillIfLow();
}

/** Tracks left after the current one; 0 once the queue has run off the end. */
function remainingAfterCurrent(queue: QueueManager.QueueState): number {
  return Math.max(0, queue.tracks.length - 1 - queue.currentIndex);
}

async function autoDjRefillIfLow(): Promise<void> {
  const queue = currentQueue();
  // Repeat wraps the queue, so it never runs out; an empty queue has no seed to build on.
  if (!useAutoDjStore.getState().enabled || queue.repeat !== 'off' || queue.tracks.length === 0) return;
  if (remainingAfterCurrent(queue) > REFILL_THRESHOLD) return;
  await autoDjRefill();
}

/**
 * Appends a batch of generated Tracks: same-genre and similar Tracks plus a random share (see
 * auto-dj.ts). Fetches in the background and never blocks playback; if the Queue had already run
 * off the end by the time the batch lands, playback resumes on the first new Track.
 */
async function autoDjRefill(): Promise<void> {
  const credentials = useAuthStore.getState().credentials;
  if (refilling || !credentials) return;

  const before = currentQueue();
  const seed = QueueManager.getCurrentTrack(before) ?? before.tracks[before.tracks.length - 1];
  if (!seed) return;

  refilling = true;
  try {
    const { serverUrl } = credentials;
    const { source, randomness } = useAutoDjSettingsStore.getState();
    const wantGenre = source !== 'random' && seed.genre !== undefined;
    const similarArtistId = source === 'mixed' ? seed.artistId : undefined;
    const [similar, genre, random] = await Promise.allSettled([
      similarArtistId ? getSimilarSongs2(serverUrl, credentials, similarArtistId, BATCH_SIZE) : Promise.resolve([]),
      wantGenre
        ? getRandomSongs(serverUrl, credentials, { size: BATCH_SIZE * 2, genre: seed.genre })
        : Promise.resolve([]),
      getRandomSongs(serverUrl, credentials, { size: BATCH_SIZE }),
    ]);

    // Similar is allowed to fail (no Last.fm); only an all-sources failure is worth a Notice.
    const genreFailed = !wantGenre || genre.status === 'rejected';
    if (genreFailed && random.status === 'rejected') {
      if (!noticeShown) {
        noticeShown = true;
        showNotice("Auto-DJ couldn't load more tracks.");
      }
      return;
    }

    const value = (r: PromiseSettledResult<Track[]>): Track[] => (r.status === 'fulfilled' ? r.value : []);
    const { recentIds } = useAutoDjStore.getState();
    // Re-read the queue: it may have changed while the requests were in flight.
    let queue = currentQueue();
    const exclude = new Set([...queue.tracks.map((t) => t.id), ...recentIds]);
    const batch = pickNextBatch({
      pools: { similar: value(similar), genre: value(genre), random: value(random) },
      excludeIds: exclude,
      randomness: source === 'random' ? 1 : randomness / 100,
    });
    if (batch.length === 0 || !useAutoDjStore.getState().enabled) return;

    const wasFinished = queue.currentIndex >= queue.tracks.length;
    const firstNewIndex = queue.tracks.length;
    for (const track of batch) queue = QueueManager.enqueue(queue, track);
    useAutoDjStore.getState().remember(batch.map((t) => t.id));
    usePlayerStore.setState(
      wasFinished
        ? { queue: { ...queue, currentIndex: firstNewIndex }, desiredPlaying: true }
        : { queue },
    );
  } finally {
    refilling = false;
  }
}
