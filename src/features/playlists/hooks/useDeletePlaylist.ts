import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { deletePlaylist } from '@/api/subsonic/endpoints/playlists';
import type { Playlist } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';

type DeleteContext = { previousList: Playlist[] | undefined };

/** Deletes a playlist, optimistically dropping it from the list with rollback on failure. */
export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  const credentials = useAuthStore((state) => state.credentials);

  return useMutation<void, unknown, string, DeleteContext>({
    mutationFn: (id) => {
      if (!credentials) throw new Error('Not authenticated.');
      return deletePlaylist(credentials.serverUrl, credentials, id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlists() });
      const previousList = queryClient.getQueryData<Playlist[]>(queryKeys.playlists());
      if (previousList) {
        queryClient.setQueryData<Playlist[]>(
          queryKeys.playlists(),
          previousList.filter((playlist) => playlist.id !== id),
        );
      }
      return { previousList };
    },
    onError: (_error, _id, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(queryKeys.playlists(), context.previousList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
    },
  });
}
