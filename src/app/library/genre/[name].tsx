import { useLocalSearchParams } from 'expo-router';

import { GenreAlbumsScreen } from '@/features/library/components/GenreAlbumsScreen';

export default function GenreRoute() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <GenreAlbumsScreen genre={decodeURIComponent(name)} />;
}
