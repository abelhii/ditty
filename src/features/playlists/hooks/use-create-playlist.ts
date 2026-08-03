import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { createPlaylist } from '@/api/subsonic/endpoints/playlists';
import type { Playlist } from '@/api/types';
import { useAuthStore } from '@/auth/use-auth-store';

/**
 * Creates a playlist and refreshes the list. Deliberately await-then-invalidate rather than
 * optimistic: an optimistic insert would need a temporary client id reconciled to the server's real
 * one, which is fragile and not worth it for a rare action (see Build Order step 7b).
 */
export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const credentials = useAuthStore((state) => state.credentials);

  return useMutation<Playlist, unknown, string>({
    meta: { action: 'create the playlist' },
    mutationFn: (name) => {
      if (!credentials) throw new Error('Not authenticated.');
      return createPlaylist(credentials.serverUrl, credentials, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists() });
    },
  });
}
