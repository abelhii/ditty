import { useLocalSearchParams } from 'expo-router';

import { ArtistDetailScreen } from '@/features/library/components/ArtistDetailScreen';

export default function MyMusicArtistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // basePath keeps the artist's album drill-down inside the My Music tab's stack.
  return <ArtistDetailScreen artistId={id} basePath="/my-music" />;
}
