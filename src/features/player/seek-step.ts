/** Seconds a screen-reader increment/decrement or an arrow key moves the seek bar. */
export const SEEK_STEP_SECONDS = 10;

/** `position + delta` clamped to the track; null when there's nothing to seek (unknown duration). */
export function steppedSeek(position: number, duration: number, delta: number): number | null {
  if (!(duration > 0)) return null;
  return Math.min(duration, Math.max(0, position + delta));
}

/** "1:23 of 3:45" — the spoken value of the seek bar. */
export function seekValueText(position: number, duration: number, format: (s: number) => string): string {
  return `${format(position)} of ${format(duration)}`;
}
