import type { Track } from '@/api/types';

/**
 * Builds a compact audio-format label for a Track — e.g. `"FLAC · 24-bit · 44.1 kHz · 1411 kbps"`.
 *
 * A diagnostic subtitle used while we validate raw, untranscoded lossless streaming per platform
 * (ADR 0008): it makes the exact file type, bit depth, and rates visible at a glance so a silent
 * 24-bit FLAC is distinguishable from a playing MP3. Each part is omitted when the server didn't
 * report it (bit depth and sample rate are OpenSubsonic extensions); returns `''` when nothing is
 * known.
 */
export function formatTrackAudioLabel(track: Track): string {
  const parts: string[] = [];
  if (track.suffix) parts.push(track.suffix.toUpperCase());
  if (track.bitDepth) parts.push(`${track.bitDepth}-bit`);
  if (track.samplingRate) parts.push(`${formatKHz(track.samplingRate)} kHz`);
  if (track.bitRate) parts.push(`${track.bitRate} kbps`);
  return parts.join(' · ');
}

/** Hz → kHz with at most one decimal, trailing `.0` dropped: 44100 → "44.1", 48000 → "48". */
function formatKHz(hz: number): string {
  return String(Number((hz / 1000).toFixed(1)));
}
