import { useCallback, useMemo, useState } from 'react';

import { homeStatus } from '@/features/home/home-status';
import { useAlbumShelf } from '@/features/home/hooks/use-album-shelf';
import { useUnheardTracks } from '@/features/home/hooks/use-unheard-tracks';
import { homeShelves } from '@/features/home/shelves';

/**
 * Whole-of-Home state over the Shelves Home renders (they share cache entries with the Shelf
 * components, so this adds no requests): an overall `status` for the all-failed / all-empty message,
 * and a user-driven `refresh` for pull-to-refresh.
 */
export function useHomeShelves() {
  const shelves = useMemo(() => homeShelves(new Date().getFullYear()), []);
  const recentlyAdded = useAlbumShelf(shelves.find((s) => s.id === 'recentlyAdded') ?? shelves[0]);
  const frequentlyPlayed = useAlbumShelf(shelves.find((s) => s.id === 'frequentlyPlayed') ?? shelves[0]);
  const unheard = useUnheardTracks();
  const [refreshing, setRefreshing] = useState(false);

  const status = homeStatus([
    recentlyAdded,
    frequentlyPlayed,
    { ...unheard, data: unheard.data?.tracks },
  ]);

  const { refetch: refetchRecent } = recentlyAdded;
  const { refetch: refetchFrequent } = frequentlyPlayed;
  const { refetch: refetchUnheard } = unheard;
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchRecent(), refetchFrequent(), refetchUnheard()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchRecent, refetchFrequent, refetchUnheard]);

  return { status, refresh, refreshing };
}
