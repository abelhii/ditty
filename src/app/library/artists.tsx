import { useLocalSearchParams } from 'expo-router';

import { ArtistsScreen } from '@/features/library/components/ArtistsScreen';

// The full catalog list — the sectioned Artists list plus its Genres toggle — pushed from Home
// (Build Order step 9). `?view=genres` opens straight on the Genres tab so Home's two quick links
// can land on either view.
export default function ArtistsRoute() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return <ArtistsScreen initialView={view === 'genres' ? 'genres' : 'artists'} />;
}
