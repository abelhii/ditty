import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      iconColor={{ selected: colors.accent }}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* The Library tab is the server catalog (Artists/Genres). */}
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical" md="library_books" />
      </NativeTabs.Trigger>

      {/* Your Likes (Liked Songs) — a tab of its own; Home's card and the My Music rows still open it
          inside their own stacks. */}
      <NativeTabs.Trigger name="likes">
        <NativeTabs.Trigger.Label>Likes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="heart" md="favorite" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        {/* No search PNG in the icon set — use the platform's built-in search glyph (SF Symbol on
            iOS, material icon on Android) instead of shipping a new asset. */}
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      {/* My Music (playlists + Favourites) is no longer a tab: Home's Your Likes and playlist cards
          reach it. The route stays so those links resolve. */}
      <NativeTabs.Trigger name="my-music" hidden />

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
