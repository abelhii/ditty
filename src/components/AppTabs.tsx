import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {/* Home lives under the `library` route: its index is the step-9 discover shelves, with the
          full Artists/Genres catalog list pushed one level down at `/library/artists`. The tab keeps
          the internal name `library` (its stack owns the album/artist/genre detail routes). */}
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        {/* No search PNG in the icon set — use the platform's built-in search glyph (SF Symbol on
            iOS, material icon on Android) instead of shipping a new asset. */}
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="my-music">
        <NativeTabs.Trigger.Label>My Music</NativeTabs.Trigger.Label>
        {/* No My Music PNG in the icon set — use the platform's built-in playlist glyph. */}
        <NativeTabs.Trigger.Icon sf="music.note.list" md="library_music" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/settings.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
