/** Tracks shorter than this are never scrobbled (Last.fm convention). */
export const MIN_SCROBBLE_TRACK_SECONDS = 30;
/** A play counts after half the Track or this many seconds, whichever comes first. */
export const MAX_SCROBBLE_THRESHOLD_SECONDS = 240;
/** Position ticks arrive ~once a second; a bigger forward jump is a seek, not listening time. */
const MAX_TICK_SECONDS = 2.5;
/** Within this many seconds of the end (then near the start) a position drop is a loop wrap. */
const LOOP_EDGE_SECONDS = 3;

export type ScrobbleTracker = {
  trackId: string | null;
  /** Position at the previous playing tick; `null` until the first one sets a baseline. */
  lastPosition: number | null;
  /** Seconds actually listened to this play (seeks excluded). */
  played: number;
  startedAt: number;
  submitted: boolean;
};

export type ScrobbleTick = {
  trackId: string;
  /** Seconds. */
  duration: number;
  /** Seconds, as reported by the player. */
  position: number;
  playing: boolean;
  /** Date.now(). */
  now: number;
};

export type ScrobbleAction = 'nowPlaying' | 'submit';

export function createScrobbleTracker(): ScrobbleTracker {
  return { trackId: null, lastPosition: null, played: 0, startedAt: 0, submitted: false };
}

/** Seconds of listening after which a play counts, or `null` if the Track is too short / has no
 *  usable duration. */
export function scrobbleThreshold(duration: number): number | null {
  if (!Number.isFinite(duration) || duration < MIN_SCROBBLE_TRACK_SECONDS) return null;
  return Math.min(duration / 2, MAX_SCROBBLE_THRESHOLD_SECONDS);
}

/**
 * Feeds one playback tick into the tracker. Returns the next state plus at most one action to
 * report: `nowPlaying` when a play starts, `submit` once enough has been listened to. Pure: the
 * caller owns the network call. Only ticks while `playing` count; skipping before the threshold,
 * or seeking past it, never submits.
 */
export function advanceScrobbleTracker(
  state: ScrobbleTracker,
  tick: ScrobbleTick,
): { state: ScrobbleTracker; action?: ScrobbleAction } {
  if (!tick.playing) return { state };

  const isNewTrack = tick.trackId !== state.trackId;
  const delta = state.lastPosition === null ? 0 : tick.position - state.lastPosition;
  // repeat-one loops natively: the position wraps from the end back to the start.
  const isLoopWrap =
    !isNewTrack &&
    state.lastPosition !== null &&
    state.lastPosition >= tick.duration - LOOP_EDGE_SECONDS &&
    tick.position <= LOOP_EDGE_SECONDS &&
    delta < 0;

  if (isNewTrack || isLoopWrap) {
    return {
      state: {
        trackId: tick.trackId,
        lastPosition: tick.position,
        played: 0,
        startedAt: tick.now,
        submitted: false,
      },
      action: 'nowPlaying',
    };
  }

  const played = delta > 0 && delta <= MAX_TICK_SECONDS ? state.played + delta : state.played;
  const next = { ...state, lastPosition: tick.position, played };
  const threshold = scrobbleThreshold(tick.duration);

  if (!state.submitted && threshold !== null && played >= threshold) {
    return { state: { ...next, submitted: true }, action: 'submit' };
  }
  return { state: next };
}
