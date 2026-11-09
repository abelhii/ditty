import { useLocalSearchParams } from 'expo-router';

import { PlaylistDetailScreen } from '@/features/playlists/components/PlaylistDetailScreen';

export default function HomePlaylistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaylistDetailScreen playlistId={id} />;
}
