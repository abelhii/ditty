import { useLocalSearchParams } from 'expo-router';

import { ArtistDetailScreen } from '@/features/library/components/ArtistDetailScreen';

export default function HomeArtistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ArtistDetailScreen artistId={id} basePath="/home" />;
}
