import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { getLyricsBySongId, getOpenSubsonicExtensions } from '@/api/subsonic/endpoints/lyrics';
import { useAuthStore } from '@/auth/use-auth-store';

/** Whether the server advertises the OpenSubsonic `songLyrics` extension. False while the check is
 *  loading or has failed, so the Lyrics UI stays hidden until the server is known to support it. */
export function useLyricsSupported(): boolean {
  const credentials = useAuthStore((state) => state.credentials);
  const { data } = useQuery({
    queryKey: queryKeys.serverExtensions(),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getOpenSubsonicExtensions(credentials.serverUrl, credentials);
    },
    enabled: credentials !== null,
  });
  return data?.includes('songLyrics') ?? false;
}

/** A Track's lyrics; `data` is null when the server has none. */
export function useLyrics(trackId: string) {
  const credentials = useAuthStore((state) => state.credentials);
  return useQuery({
    queryKey: queryKeys.lyrics(trackId),
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated.');
      return getLyricsBySongId(credentials.serverUrl, credentials, trackId);
    },
    enabled: credentials !== null,
  });
}
