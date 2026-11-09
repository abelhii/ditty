/** The Home header's time-of-day greeting. Takes the hour (0–23) so it's deterministic under test. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
