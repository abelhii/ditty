import { Stack } from 'expo-router';
import { Platform } from 'react-native';

// The Library tab is its own stack so the artist/album/genre detail screens push on top of the
// artists list (with a native back button) instead of trying — and failing — to push onto the
// tab navigator itself. See docs.expo.dev NativeTabs: "nest a native <Stack /> layout inside the
// native tabs ... to support pushing screens." On web we keep the screens' existing full-bleed
// look and rely on browser back, so the stack header doesn't collide with the floating web tab bar.
export default function LibraryStackLayout() {
  const detailOptions = { headerShown: Platform.OS !== 'web', headerTitle: '' } as const;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="artist/[id]" options={detailOptions} />
      <Stack.Screen name="album/[id]" options={detailOptions} />
      <Stack.Screen name="genre/[name]" options={detailOptions} />
    </Stack>
  );
}
