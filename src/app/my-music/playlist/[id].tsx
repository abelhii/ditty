import { useLocalSearchParams } from 'expo-router';

import { PlaylistDetailScreen } from '@/features/playlists/components/PlaylistDetailScreen';

export default function PlaylistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaylistDetailScreen playlistId={id} />;
}
