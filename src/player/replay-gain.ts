import type { ReplayGain } from '@/api/types';

export type LevellingMode = 'off' | 'track' | 'album';

/**
 * The linear volume multiplier (0 to 1) that levels a Track using its ReplayGain tags. Only ever
 * attenuates: expo-audio's volume is capped at 1, so a quiet Track can't be boosted. Album mode falls
 * back to the Track gain when the album gain is missing; no usable gain means no change (1).
 */
export function levellingGain(replayGain: ReplayGain | undefined, mode: LevellingMode): number {
  if (mode === 'off' || !replayGain) return 1;

  const preferAlbum = mode === 'album';
  const gainDb = preferAlbum
    ? (replayGain.albumGain ?? replayGain.trackGain)
    : (replayGain.trackGain ?? replayGain.albumGain);
  if (gainDb == null || !Number.isFinite(gainDb)) return 1;

  const usedAlbum = preferAlbum && replayGain.albumGain != null;
  const peak = usedAlbum ? replayGain.albumPeak : replayGain.trackPeak;

  let multiplier = Math.pow(10, gainDb / 20);
  // A boost that would clip is capped by the peak; with attenuation-only this just guards the cap.
  if (peak != null && peak > 0) multiplier = Math.min(multiplier, 1 / peak);
  return Math.min(1, multiplier);
}
