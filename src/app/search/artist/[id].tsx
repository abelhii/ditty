import { useLocalSearchParams } from 'expo-router';

import { ArtistDetailScreen } from '@/features/library/components/ArtistDetailScreen';

export default function SearchArtistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // basePath keeps the artist's album drill-down inside the Search tab's stack.
  return <ArtistDetailScreen artistId={id} basePath="/search" />;
}
