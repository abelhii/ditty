import { Stack } from 'expo-router';

// See src/app/library/_layout.tsx: keeps the index under a detail screen opened from its URL.
export const unstable_settings = { initialRouteName: 'index' };

// The Home tab is its own stack (mirroring Library's) so an album opened from a Home tile or row
// pushes on top of Home with a native back button instead of switching tabs. Likes and playlists
// are re-mounted here for the same reason (My Music is no longer a tab), as is My Music itself,
// which Home's "See all" opens.
export default function HomeStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="album/[id]" options={{ headerTitle: '' }} />
      <Stack.Screen name="artist/[id]" options={{ headerTitle: '' }} />
      <Stack.Screen name="liked-songs" options={{ headerTitle: '' }} />
      <Stack.Screen name="my-music" options={{ headerTitle: '' }} />
      <Stack.Screen name="most-played"options={{ headerTitle: '' }} />
      <Stack.Screen name="playlist/[id]" options={{ headerTitle: '' }} />
    </Stack>
  );
}
