import { useLocalSearchParams } from 'expo-router';

import { ArtistsScreen } from '@/features/library/components/ArtistsScreen';

// The Library tab: the full catalog list — the sectioned Artists list plus its Genres toggle.
// `?view=genres` opens straight on the Genres view.
export default function LibraryRoute() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return <ArtistsScreen initialView={view === 'genres' ? 'genres' : 'artists'} />;
}
