import { Stack } from 'expo-router';

// See src/app/library/_layout.tsx: keeps the index under a detail screen opened from its URL.
export const unstable_settings = { initialRouteName: 'index' };

// The Search tab is its own stack (mirroring Library's) so an artist/album detail pushes on top of
// the search results with a native back button, and drilling Artist → Album stays inside this tab.
// See src/app/library/_layout.tsx for the same pattern and rationale.
export default function SearchStackLayout() {
  const detailOptions = { headerTitle: '' } as const;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="artist/[id]" options={detailOptions} />
      <Stack.Screen name="album/[id]" options={detailOptions} />
      <Stack.Screen name="playlist/[id]" options={detailOptions} />
    </Stack>
  );
}
