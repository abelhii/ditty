import type { Lyrics } from '@/api/types';
import { currentLineIndex } from '@/features/player/lyrics';

function synced(starts: number[], offsetMs = 0): Lyrics {
  return { synced: true, offsetMs, lines: starts.map((startMs, i) => ({ text: `line ${i}`, startMs })) };
}

describe('currentLineIndex', () => {
  const lyrics = synced([1000, 3000, 5000]);

  it('is -1 before the first line', () => {
    expect(currentLineIndex(lyrics, 0)).toBe(-1);
    expect(currentLineIndex(lyrics, 0.999)).toBe(-1);
  });

  it('picks the line whose start has passed, including exactly at its start', () => {
    expect(currentLineIndex(lyrics, 1)).toBe(0);
    expect(currentLineIndex(lyrics, 2.5)).toBe(0);
    expect(currentLineIndex(lyrics, 3)).toBe(1);
    expect(currentLineIndex(lyrics, 4.9)).toBe(1);
  });

  it('stays on the last line after it', () => {
    expect(currentLineIndex(lyrics, 5)).toBe(2);
    expect(currentLineIndex(lyrics, 999)).toBe(2);
  });

  it('applies the offset: positive makes lines appear sooner, negative later', () => {
    expect(currentLineIndex(synced([1000, 3000], 500), 0.5)).toBe(0);
    expect(currentLineIndex(synced([1000, 3000], 500), 0.4)).toBe(-1);
    expect(currentLineIndex(synced([1000, 3000], -500), 1.4)).toBe(-1);
    expect(currentLineIndex(synced([1000, 3000], -500), 1.5)).toBe(0);
  });

  it('handles unsorted lines by start time, not array order', () => {
    const unsorted = synced([5000, 1000, 3000]);
    expect(currentLineIndex(unsorted, 3.5)).toBe(2);
    expect(currentLineIndex(unsorted, 6)).toBe(0);
    expect(currentLineIndex(unsorted, 1.5)).toBe(1);
  });

  it('is -1 for unsynced or empty lyrics', () => {
    expect(currentLineIndex({ synced: false, offsetMs: 0, lines: [{ text: 'a' }] }, 10)).toBe(-1);
    expect(currentLineIndex(synced([]), 10)).toBe(-1);
  });
});
