import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';
import type { StreamQuality } from '@/api/subsonic/endpoints/media';

type StreamQualitySettings = { quality: StreamQuality };

type StreamQualityState = StreamQualitySettings & {
  setQuality: (quality: StreamQuality) => void;
};

const jsonStorage = createJSONStorage<StreamQualitySettings>(
  (): StateStorage => ({ getItem, setItem, removeItem }),
);

/** The user's durable streaming-quality preference. `original` by default: playback is bit-perfect
 *  unless the user opts into a lossy data saver. kvStorage is synchronous, so `persist` hydrates at
 *  creation. */
export const useStreamQualityStore = create<StreamQualityState>()(
  persist(
    (set) => ({
      quality: 'original',
      setQuality: (quality) => set({ quality }),
    }),
    {
      name: 'music-player-stream-quality',
      version: 1,
      storage: jsonStorage,
      partialize: (state): StreamQualitySettings => ({ quality: state.quality }),
    },
  ),
);
