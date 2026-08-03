import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { updatePlaylist } from '@/api/subsonic/endpoints/playlists';
import type { Playlist } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';
import type { PlaylistDetail } from '@/features/playlists/hooks/use-playlist';

type UpdateVariables = { id: string; name?: string; isPublic?: boolean };

type UpdateContext = {
  previousList: Playlist[] | undefined;
  previousDetail: PlaylistDetail | undefined;
};

/** Renames a playlist or flips its public/private scope, optimistically with rollback. */
export function useUpdatePlaylist() {
  const queryClient = useQueryClient();
  const credentials = useAuthStore((state) => state.credentials);

  return useMutation<void, unknown, UpdateVariables, UpdateContext>({
    meta: { action: 'update the playlist' },
    mutationFn: ({ id, name, isPublic }) => {
      if (!credentials) throw new Error('Not authenticated.');
      return updatePlaylist(credentials.serverUrl, credentials, id, { name, isPublic });
    },
    onMutate: async ({ id, name, isPublic }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.playlist(id) });

      const previousList = queryClient.getQueryData<Playlist[]>(queryKeys.playlists());
      const previousDetail = queryClient.getQueryData<PlaylistDetail>(queryKeys.playlist(id));

      const apply = (playlist: Playlist): Playlist => ({
        ...playlist,
        name: name ?? playlist.name,
        isPublic: isPublic ?? playlist.isPublic,
      });

      if (previousList) {
        queryClient.setQueryData<Playlist[]>(
          queryKeys.playlists(),
          previousList.map((playlist) => (playlist.id === id ? apply(playlist) : playlist)),
        );
      }
      if (previousDetail) {
        queryClient.setQueryData<PlaylistDetail>(queryKeys.playlist(id), {
          ...previousDetail,
          playlist: apply(previousDetail.playlist),
        });
      }

      return { previousList, previousDetail };
    },
    onError: (_error, { id }, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(queryKeys.playlists(), context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(queryKeys.playlist(id), context.previousDetail);
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playlist(id) });
    },
  });
}
