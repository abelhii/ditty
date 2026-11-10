import {
  advanceScrobbleTracker,
  createScrobbleTracker,
  scrobbleThreshold,
  type ScrobbleAction,
  type ScrobbleTick,
} from '@/player/scrobble-tracker';

function run(ticks: Partial<ScrobbleTick>[], duration = 200) {
  let state = createScrobbleTracker();
  const actions: (ScrobbleAction | undefined)[] = [];
  ticks.forEach((tick, index) => {
    const result = advanceScrobbleTracker(state, {
      trackId: 'a',
      duration,
      position: 0,
      playing: true,
      now: 1000 + index,
      ...tick,
    });
    state = result.state;
    actions.push(result.action);
  });
  return { state, actions: actions.filter(Boolean) };
}

/** One tick per second from `from` to `to` inclusive. */
function seconds(from: number, to: number): Partial<ScrobbleTick>[] {
  return Array.from({ length: to - from + 1 }, (_, i) => ({ position: from + i }));
}

describe('scrobbleThreshold', () => {
  it('is half the track, capped at 4 minutes', () => {
    expect(scrobbleThreshold(200)).toBe(100);
    expect(scrobbleThreshold(1000)).toBe(240);
  });

  it('is null for short, zero, NaN or infinite durations', () => {
    expect(scrobbleThreshold(29)).toBeNull();
    expect(scrobbleThreshold(0)).toBeNull();
    expect(scrobbleThreshold(NaN)).toBeNull();
    expect(scrobbleThreshold(Infinity)).toBeNull();
  });
});

describe('advanceScrobbleTracker', () => {
  it('sends now-playing once, then submits once after the threshold', () => {
    const { actions } = run(seconds(0, 150));
    expect(actions).toEqual(['nowPlaying', 'submit']);
  });

  it('does not submit when skipped before the threshold', () => {
    expect(run(seconds(0, 99)).actions).toEqual(['nowPlaying']);
  });

  it('ignores ticks while paused', () => {
    const ticks = [...seconds(0, 50), { position: 51, playing: false }, { position: 52, playing: false }];
    const { state } = run(ticks);
    expect(state.played).toBe(50);
  });

  it('does not count a forward seek as listening time', () => {
    const { actions, state } = run([...seconds(0, 10), ...seconds(150, 160)]);
    expect(actions).toEqual(['nowPlaying']);
    expect(state.played).toBe(20);
  });

  it('does not double count when seeking back and replaying a section', () => {
    const { actions } = run([...seconds(0, 60), ...seconds(0, 30)]);
    expect(actions).toEqual(['nowPlaying']);
  });

  it('never submits a track shorter than 30 seconds', () => {
    expect(run(seconds(0, 25), 25).actions).toEqual(['nowPlaying']);
  });

  it('never submits with a zero duration', () => {
    expect(run(seconds(0, 60), 0).actions).toEqual(['nowPlaying']);
  });

  it('starts a new play, with a fresh now-playing, on a track change', () => {
    const { actions } = run([...seconds(0, 150), { trackId: 'b', position: 0 }, ...seconds(1, 3).map((t) => ({ ...t, trackId: 'b' }))]);
    expect(actions).toEqual(['nowPlaying', 'submit', 'nowPlaying']);
  });

  it('counts a repeat-one loop wrap as a new play', () => {
    const { actions } = run([...seconds(0, 150), ...seconds(151, 199), ...seconds(0, 150)]);
    expect(actions).toEqual(['nowPlaying', 'submit', 'nowPlaying', 'submit']);
  });

  it('does not treat a seek back to the start mid-track as a new play', () => {
    const { actions } = run([...seconds(0, 60), ...seconds(0, 20)]);
    expect(actions).toEqual(['nowPlaying']);
  });
});
