import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { star, unstar } from '@/api/subsonic/endpoints/annotations';
import type { Album, Artist, Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import {
  addToStarred,
  removeFromStarred,
  type StarredCollections,
  type StarTarget,
} from '@/features/favourites/starredCache';
import { usePlayerStore } from '@/player/usePlayerStore';

type AlbumDetail = { album: Album; tracks: Track[] };
type ArtistDetail = { artist: Artist; albums: Album[] };

/** Flips the starred flag on the entity inside its detail query, so an album/artist detail-header
 *  heart updates optimistically (those hearts read from `album(id)` / `artist(id)`, not `starred()`). */
function patchDetailStarred(kind: StarTarget['kind'], starred: boolean) {
  return (old: unknown): unknown => {
    if (!old) return old;
    if (kind === 'album') {
      const detail = old as AlbumDetail;
      return { ...detail, album: { ...detail.album, starred } };
    }
    if (kind === 'artist') {
      const detail = old as ArtistDetail;
      return { ...detail, artist: { ...detail.artist, starred } };
    }
    return old;
  };
}

type StarContext = {
  previousStarred: StarredCollections | undefined;
  detailKey: readonly unknown[] | null;
  previousDetail: unknown;
  target: StarTarget;
};

/**
 * Star (or unstar) a song/album/artist with an optimistic, rollback-on-error update. The Favourites
 * collection (`starred()`), the entity's detail query, and any queued copy of a starred song are all
 * patched immediately; the server call runs behind that, and `starred()` is re-fetched on settle.
 */
function useToggleStar(starred: boolean) {
  const queryClient = useQueryClient();
  const credentials = useAuthStore((state) => state.credentials);
  const setTrackStarred = usePlayerStore((state) => state.setTrackStarred);

  return useMutation<void, unknown, StarTarget, StarContext>({
    // Read by the global MutationCache to word a failure Notice (ADR 0007); rollback stays below.
    meta: { action: starred ? 'favourite this' : 'remove this favourite' },
    mutationFn: (target) => {
      if (!credentials) throw new Error('Not authenticated.');
      const call = starred ? star : unstar;
      return call(credentials.serverUrl, credentials, target.item.id, target.kind);
    },
    onMutate: async (target) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.starred() });
      const previousStarred = queryClient.getQueryData<StarredCollections>(queryKeys.starred());
      if (previousStarred) {
        queryClient.setQueryData<StarredCollections>(
          queryKeys.starred(),
          starred
            ? addToStarred(previousStarred, target)
            : removeFromStarred(previousStarred, target.kind, target.item.id),
        );
      }

      const detailKey =
        target.kind === 'album'
          ? queryKeys.album(target.item.id)
          : target.kind === 'artist'
            ? queryKeys.artist(target.item.id)
            : null;
      let previousDetail: unknown;
      if (detailKey) {
        await queryClient.cancelQueries({ queryKey: detailKey });
        previousDetail = queryClient.getQueryData(detailKey);
        queryClient.setQueryData(detailKey, patchDetailStarred(target.kind, starred));
      }

      if (target.kind === 'song') setTrackStarred(target.item.id, starred);

      return { previousStarred, detailKey, previousDetail, target };
    },
    onError: (_error, _target, context) => {
      if (!context) return;
      if (context.previousStarred !== undefined) {
        queryClient.setQueryData(queryKeys.starred(), context.previousStarred);
      }
      if (context.detailKey && context.previousDetail !== undefined) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      if (context.target.kind === 'song') setTrackStarred(context.target.item.id, !starred);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.starred() });
    },
  });
}

export const useStar = () => useToggleStar(true);
export const useUnstar = () => useToggleStar(false);
