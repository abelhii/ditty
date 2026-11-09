import { Stack } from 'expo-router';

// See src/app/library/_layout.tsx: keeps the index under a detail screen opened from its URL.
export const unstable_settings = { initialRouteName: 'index' };

// The My Music tab is its own stack (mirroring Library's) so Liked Songs, playlist detail, and the
// album/artist screens drilled into from the My Music filter chips push on top of the landing with
// a native back button. See src/app/library/_layout.tsx for the same pattern and rationale.
export default function MyMusicStackLayout() {
  const detailOptions = { headerTitle: '' } as const;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="liked-songs" options={detailOptions} />
      <Stack.Screen name="playlist/[id]" options={detailOptions} />
      <Stack.Screen name="album/[id]" options={detailOptions} />
      <Stack.Screen name="artist/[id]" options={detailOptions} />
    </Stack>
  );
}
