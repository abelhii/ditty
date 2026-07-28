import { Stack } from 'expo-router';
import { Platform } from 'react-native';

// The Search tab is its own stack (mirroring Library's) so an artist/album detail pushes on top of
// the search results with a native back button, and drilling Artist → Album stays inside this tab.
// See src/app/library/_layout.tsx for the same pattern and rationale.
export default function SearchStackLayout() {
  const detailOptions = { headerShown: Platform.OS !== 'web', headerTitle: '' } as const;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="artist/[id]" options={detailOptions} />
      <Stack.Screen name="album/[id]" options={detailOptions} />
    </Stack>
  );
}
