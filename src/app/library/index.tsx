import { useLocalSearchParams } from 'expo-router';

import { ArtistsScreen } from '@/features/library/components/ArtistsScreen';
import { WideLibraryScreen } from '@/features/library/components/WideLibraryScreen';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';

// The Library tab: the full catalog list — the sectioned Artists list plus its Genres toggle.
// `?view=genres` opens straight on the Genres view. On the wide layout it is the Library table.
export default function LibraryRoute() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const wide = useIsWideLayout();
  if (wide) return <WideLibraryScreen />;
  return <ArtistsScreen initialView={view === 'genres' ? 'genres' : 'artists'} />;
}
