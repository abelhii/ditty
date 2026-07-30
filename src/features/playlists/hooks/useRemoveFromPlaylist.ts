import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { updatePlaylist } from '@/api/subsonic/endpoints/playlists';
import type { Playlist } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import type { PlaylistDetail } from '@/features/playlists/hooks/usePlaylist';

/** `index` is the *positional* index into the playlist's current track list — updatePlaylist removes
 *  by position (`songIndexToRemove`), not by song id, so the optimistic patch must splice the same
 *  index the server will. */
type RemoveVariables = { playlistId: string; index: number };

type RemoveContext = {
  previousList: Playlist[] | undefined;
  previousDetail: PlaylistDetail | undefined;
};

/** Removes the track at `index` from a playlist, optimistically with rollback on failure. */
export function useRemoveFromPlaylist() {
  const queryClient = useQueryClient();
  const credentials = useAuthStore((state) => state.credentials);

  return useMutation<void, unknown, RemoveVariables, RemoveContext>({
    meta: { action: 'remove from the playlist' },
    mutationFn: ({ playlistId, index }) => {
      if (!credentials) throw new Error('Not authenticated.');
      return updatePlaylist(credentials.serverUrl, credentials, playlistId, { songIndexToRemove: index });
    },
    onMutate: async ({ playlistId, index }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.playlist(playlistId) });

      const previousList = queryClient.getQueryData<Playlist[]>(queryKeys.playlists());
      const previousDetail = queryClient.getQueryData<PlaylistDetail>(queryKeys.playlist(playlistId));

      const removed = previousDetail?.tracks[index];
      if (previousDetail && removed) {
        queryClient.setQueryData<PlaylistDetail>(queryKeys.playlist(playlistId), {
          playlist: {
            ...previousDetail.playlist,
            songCount: Math.max(0, previousDetail.playlist.songCount - 1),
            duration: Math.max(0, previousDetail.playlist.duration - removed.duration),
          },
          tracks: previousDetail.tracks.filter((_, i) => i !== index),
        });
      }
      if (previousList && removed) {
        queryClient.setQueryData<Playlist[]>(
          queryKeys.playlists(),
          previousList.map((playlist) =>
            playlist.id === playlistId
              ? {
                  ...playlist,
                  songCount: Math.max(0, playlist.songCount - 1),
                  duration: Math.max(0, playlist.duration - removed.duration),
                }
              : playlist,
          ),
        );
      }

      return { previousList, previousDetail };
    },
    onError: (_error, { playlistId }, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(queryKeys.playlists(), context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(queryKeys.playlist(playlistId), context.previousDetail);
      }
    },
    onSettled: (_data, _error, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playlist(playlistId) });
    },
  });
}
