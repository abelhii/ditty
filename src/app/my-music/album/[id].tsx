import { useLocalSearchParams } from 'expo-router';

import { AlbumDetailScreen } from '@/features/library/components/AlbumDetailScreen';

export default function MyMusicAlbumRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlbumDetailScreen albumId={id} />;
}
