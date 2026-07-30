import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { updatePlaylist } from '@/api/subsonic/endpoints/playlists';
import type { Playlist, Track } from '@/api/types';
import { useAuthStore } from '@/auth/useAuthStore';
import type { PlaylistDetail } from '@/features/playlists/hooks/usePlaylist';

type AddVariables = { playlistId: string; track: Track };

type AddContext = {
  previousList: Playlist[] | undefined;
  previousDetail: PlaylistDetail | undefined;
};

/** Adds a single track to a playlist (updatePlaylist's `songIdToAdd`), optimistically appending it
 *  to the detail's track list and bumping the song count, with rollback on failure. */
export function useAddToPlaylist() {
  const queryClient = useQueryClient();
  const credentials = useAuthStore((state) => state.credentials);

  return useMutation<void, unknown, AddVariables, AddContext>({
    meta: { action: 'add to the playlist' },
    mutationFn: ({ playlistId, track }) => {
      if (!credentials) throw new Error('Not authenticated.');
      return updatePlaylist(credentials.serverUrl, credentials, playlistId, { songIdToAdd: track.id });
    },
    onMutate: async ({ playlistId, track }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.playlist(playlistId) });

      const previousList = queryClient.getQueryData<Playlist[]>(queryKeys.playlists());
      const previousDetail = queryClient.getQueryData<PlaylistDetail>(queryKeys.playlist(playlistId));

      if (previousList) {
        queryClient.setQueryData<Playlist[]>(
          queryKeys.playlists(),
          previousList.map((playlist) =>
            playlist.id === playlistId
              ? { ...playlist, songCount: playlist.songCount + 1, duration: playlist.duration + track.duration }
              : playlist,
          ),
        );
      }
      if (previousDetail) {
        queryClient.setQueryData<PlaylistDetail>(queryKeys.playlist(playlistId), {
          playlist: {
            ...previousDetail.playlist,
            songCount: previousDetail.playlist.songCount + 1,
            duration: previousDetail.playlist.duration + track.duration,
          },
          tracks: [...previousDetail.tracks, track],
        });
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
