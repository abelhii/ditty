import { useLocalSearchParams } from 'expo-router';

import { PlaylistDetailScreen } from '@/features/playlists/components/PlaylistDetailScreen';

export default function SearchPlaylistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaylistDetailScreen playlistId={id} />;
}
