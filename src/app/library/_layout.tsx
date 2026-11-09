import { Stack } from 'expo-router';

// A detail screen opened straight from its URL (a reload, a shared link, an installed web app) still
// gets the tab's index underneath it, so its header has a back button.
export const unstable_settings = { initialRouteName: 'index' };

// The Library tab is its own stack so the artist/album/genre detail screens push on top of the
// artists list (with a native back button) instead of trying — and failing — to push onto the
// tab navigator itself. See docs.expo.dev NativeTabs: "nest a native <Stack /> layout inside the
// native tabs ... to support pushing screens." The header, and its back button, shows on web too:
// the web tab bar sits above the tab's content, not over it.
export default function LibraryStackLayout() {
  const detailOptions = { headerTitle: '' } as const;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="artists" options={detailOptions} />
      <Stack.Screen name="artist/[id]" options={detailOptions} />
      <Stack.Screen name="album/[id]" options={detailOptions} />
      <Stack.Screen name="genre/[name]" options={detailOptions} />
    </Stack>
  );
}
