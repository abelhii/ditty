import { HomeScreen } from '@/features/home/components/HomeScreen';

// The Home tab's discover shelves (Build Order step 9), replacing step 7b's redirect into the
// Artists list. The full catalog lists now live one level down at `/library/artists`.
export default function LibraryRoute() {
  return <HomeScreen />;
}
